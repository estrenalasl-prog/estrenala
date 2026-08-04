import { describe, it, expect } from "vitest";
import { conectarDominio, quitarDominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";
import type { ProjectStore } from "@/src/repositories/types";
import type { DeployTarget } from "@/src/publish/deploy-target";

const HOSTS = { platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com" };

function fakeStore(overrides: Partial<Record<string, unknown>> = {}) {
  const estado = { dominio: null as string | null, setLlamadas: [] as (string | null)[] };
  const store = {
    async getProject() {
      return { id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: estado.dominio,
        publishedSnapshotId: "s1", noIndexar: false, createdAt: "" };
    },
    async dominioLibre() { return true; },
    async setDominio(_o: string, _p: string, d: string | null) { estado.setLlamadas.push(d); estado.dominio = d; return true; },
    ...overrides,
  } as unknown as ProjectStore;
  return { store, estado };
}

function fakeDeploy() {
  const llamadas: string[] = [];
  const deploy: DeployTarget = {
    async publish() { return { ok: true }; },
    async unpublish() {},
    async connectDomain({ dominio }) { llamadas.push(`connect:${dominio}`); },
    async disconnectDomain({ dominio }) { llamadas.push(`disconnect:${dominio}`); },
  };
  return { deploy, llamadas };
}

describe("conectarDominio", () => {
  it("normaliza, llama al deploy y guarda", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    const r = await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "WWW.Cliente.COM/", ...HOSTS });
    expect(r).toMatchObject({ dominio: "cliente.com" });
    expect(llamadas).toEqual(["connect:cliente.com"]);
    expect(estado.setLlamadas).toEqual(["cliente.com"]);
  });
  it("formato malo → 400 con mensaje exacto y sin tocar deploy ni BD", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "sin-punto", ...HOSTS }))
      .rejects.toMatchObject({ message: "Dominio no válido (ejemplo: miempresa.com)", status: 400 });
    expect(llamadas).toEqual([]);
    expect(estado.setLlamadas).toEqual([]);
  });
  it("dominio de la plataforma → 400", async () => {
    const { store } = fakeStore();
    const { deploy } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "malo.plataforma.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 400 });
  });
  it("ocupado → 409 con mensaje exacto", async () => {
    const { store } = fakeStore({ dominioLibre: async () => false });
    const { deploy } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ message: "Ese dominio ya está conectado a otro proyecto", status: 409 });
  });
  it("deploy falla → 502 y NO se guarda", async () => {
    const { store, estado } = fakeStore();
    const deploy: DeployTarget = {
      async publish() { return { ok: true }; }, async unpublish() {},
      async connectDomain() { throw new Error("dokploy caído"); },
      async disconnectDomain() {},
    };
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 502 });
    expect(estado.setLlamadas).toEqual([]);
  });
  it("carrera (setDominio false) → 409 y limpieza best-effort del deploy", async () => {
    const { store } = fakeStore({ setDominio: async () => false });
    const { deploy, llamadas } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 409 });
    expect(llamadas).toEqual(["connect:cliente.com", "disconnect:cliente.com"]);
  });
  it("cambiar de dominio desconecta el anterior", async () => {
    const { store } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "viejo.com",
        publishedSnapshotId: "s1", noIndexar: false, createdAt: "" }),
    });
    const { deploy, llamadas } = fakeDeploy();
    await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "nuevo.com", ...HOSTS });
    expect(llamadas).toEqual(["connect:nuevo.com", "disconnect:viejo.com"]);
  });
  it("mismo dominio que ya tiene → early return sin llamadas", async () => {
    const { store } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "cliente.com",
        publishedSnapshotId: "s1", noIndexar: false, createdAt: "" }),
    });
    const { deploy, llamadas } = fakeDeploy();
    const r = await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS });
    expect(r).toMatchObject({ dominio: "cliente.com" });
    expect(llamadas).toEqual([]);
  });
});

describe("quitarDominio", () => {
  it("pone null y desconecta; el fallo del deploy no rompe", async () => {
    const { store, estado } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "cliente.com",
        publishedSnapshotId: "s1", noIndexar: false, createdAt: "" }),
    });
    const deploy: DeployTarget = {
      async publish() { return { ok: true }; }, async unpublish() {},
      async connectDomain() {},
      async disconnectDomain() { throw new Error("dokploy caído"); },
    };
    await expect(quitarDominio({ store, deploy }, { orgId: "o1", projectId: "p1" })).resolves.toBeUndefined();
    expect(estado.setLlamadas).toEqual([null]);
  });
  it("sin dominio conectado → no hace nada", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    await quitarDominio({ store, deploy }, { orgId: "o1", projectId: "p1" });
    expect(estado.setLlamadas).toEqual([]);
    expect(llamadas).toEqual([]);
  });
  it("proyecto inexistente → 404", async () => {
    const { store } = fakeStore({ getProject: async () => null });
    const { deploy } = fakeDeploy();
    await expect(quitarDominio({ store, deploy }, { orgId: "o1", projectId: "nope" }))
      .rejects.toMatchObject({ status: 404 });
  });
});
