import { describe, it, expect } from "vitest";
import {
  publishSite, unpublishSite, cambiarSubdominio, conectarDominio,
  MSG_DOMINIO_SIN_VERIFICAR,
} from "@/src/publish/publish-site";
import { MSG_CUPO_DIRECCIONES } from "@/src/publish/cupo-direcciones";
import { PublishError } from "@/src/publish/errors";
import type { DeployTarget } from "@/src/publish/deploy-target";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class FakeStore implements ProjectStore {
  nombre = "Cafetería Aurora";
  subdominio: string | null = null;
  dominio: string | null = null;
  publishedSnapshotId: string | null = null;
  currentSnapshot: SnapshotRow | null = { id: "s1", projectId: "p1", storagePrefix: "projects/p1/snapshots/s1/", tipo: "edit" };
  ocupados = new Set<string>();
  hayProyecto = true;
  setSubdominioDevuelve = true;

  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    if (!this.hayProyecto) return null;
    return {
      id: "p1", orgId: "org1", nombre: this.nombre, entryPath: "index.html",
      currentSnapshotId: this.currentSnapshot?.id ?? null,
      subdominio: this.subdominio, dominio: this.dominio, publishedSnapshotId: this.publishedSnapshotId,
      noIndexar: false, recogeFormularios: false, createdAt: "",
    };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return this.currentSnapshot; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost() { return null; }
  async setNoIndexar(): Promise<void> {}
  async setPublished(_o: string, _p: string, id: string | null) { this.publishedSnapshotId = id; }
  async subdominioLibre(s: string): Promise<boolean> { return !this.ocupados.has(s); }
  async setSubdominio(_o: string, _p: string, s: string): Promise<boolean> {
    if (!this.setSubdominioDevuelve) return false;
    this.subdominio = s; return true;
  }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(_o: string, _p: string, d: string | null): Promise<boolean> { this.dominio = d; return true; }
}

class FakeDeploy implements DeployTarget {
  publicados: string[] = [];
  despublicados: string[] = [];
  async publish(i: { subdominio: string }) { this.publicados.push(i.subdominio); return { ok: true as const }; }
  async unpublish(i: { subdominio: string }) { this.despublicados.push(i.subdominio); }
  async connectDomain() {}
  async disconnectDomain() {}
}

describe("publishSite", () => {
  it("primera publicación: genera slug del nombre, fija puntero y llama al deploy", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    const r = await publishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora");
    expect(r.publishedSnapshotId).toBe("s1");
    expect(store.subdominio).toBe("cafeteria-aurora");
    expect(store.publishedSnapshotId).toBe("s1");
    expect(deploy.publicados).toEqual(["cafeteria-aurora"]);
  });

  it("colisión de slug → sufijo -2", async () => {
    const store = new FakeStore(); store.ocupados.add("cafeteria-aurora");
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora-2");
  });

  it("nombre reservado → salta al sufijo", async () => {
    const store = new FakeStore(); store.nombre = "www";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("www-2");
  });

  it("republicar conserva el subdominio existente", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("mi-sub");
  });

  it("sin snapshot actual → 400", async () => {
    const store = new FakeStore(); store.currentSnapshot = null;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toThrow(PublishError);
  });

  it("carrera en setSubdominio → 409", async () => {
    const store = new FakeStore(); store.setSubdominioDevuelve = false;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toMatchObject({ status: 409 });
  });
});

describe("unpublishSite", () => {
  it("pone el puntero a null y notifica al deploy", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub"; store.publishedSnapshotId = "s1";
    const deploy = new FakeDeploy();
    await unpublishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(store.publishedSnapshotId).toBeNull();
    expect(deploy.despublicados).toEqual(["mi-sub"]);
  });
});

describe("cambiarSubdominio", () => {
  it("cambia un subdominio válido y libre", async () => {
    const store = new FakeStore();
    const r = await cambiarSubdominio({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1", subdominio: "Nuevo-Sub" });
    expect(r.subdominio).toBe("nuevo-sub"); // normaliza a minúsculas
    expect(store.subdominio).toBe("nuevo-sub");
  });
  it("si la web ESTÁ publicada, mueve su ruta: alta de la nueva y baja de la vieja", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    store.subdominio = "vieja";
    store.publishedSnapshotId = "s1"; // publicada
    await cambiarSubdominio({ store, deploy }, { orgId: "org1", projectId: "p1", subdominio: "nueva" });
    // El alta va PRIMERO: si fallara, mejor seguir sirviendo por la dirección vieja.
    expect(deploy.publicados).toEqual(["nueva"]);
    expect(deploy.despublicados).toEqual(["vieja"]);
  });

  it("si NO está publicada, no molesta al servidor", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    store.subdominio = "vieja";
    store.publishedSnapshotId = null;
    await cambiarSubdominio({ store, deploy }, { orgId: "org1", projectId: "p1", subdominio: "nueva" });
    expect(deploy.publicados).toEqual([]);
    expect(deploy.despublicados).toEqual([]);
  });

  it("si la baja de la vieja falla, el cambio NO se arruina", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    store.subdominio = "vieja";
    store.publishedSnapshotId = "s1";
    deploy.unpublish = async () => { throw new Error("Dokploy caído"); };
    const r = await cambiarSubdominio({ store, deploy }, { orgId: "org1", projectId: "p1", subdominio: "nueva" });
    expect(r.subdominio).toBe("nueva");
    expect(deploy.publicados).toEqual(["nueva"]); // la nueva quedó servida
  });

  it("formato inválido → 400", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore(), deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1", subdominio: "-malo-" }))
      .rejects.toMatchObject({ status: 400 });
  });
  it("reservado → 400 con mensaje de reservado", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore(), deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1", subdominio: "www" }))
      .rejects.toMatchObject({ status: 400, message: "Ese subdominio está reservado" });
  });
  it("ocupado → 409", async () => {
    const store = new FakeStore(); store.ocupados.add("tomado");
    await expect(cambiarSubdominio({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1", subdominio: "tomado" }))
      .rejects.toMatchObject({ status: 409 });
  });
});

describe("cupo de direcciones (freno del cupo de certificados)", () => {
  // Cada dirección nueva pide un certificado a Let's Encrypt y ese cupo es
  // COMPARTIDO por todos los clientes: sin freno, una cuenta en bucle deja a
  // todo el mundo sin poder emitir.
  const lleno = async () => false;
  const libre = async () => true;

  it("con cupo libre, el cambio sale adelante y se da de alta la dirección", async () => {
    const store = new FakeStore(); store.publishedSnapshotId = "s1";
    const deploy = new FakeDeploy();
    await cambiarSubdominio({ store, deploy, cupo: libre }, { orgId: "org1", projectId: "p1", subdominio: "nuevo" });
    expect(deploy.publicados).toContain("nuevo");
  });

  it("sin cupo → 429 y NO se toca el subdominio guardado", async () => {
    const store = new FakeStore(); store.subdominio = "el-de-antes";
    const deploy = new FakeDeploy();
    await expect(cambiarSubdominio({ store, deploy, cupo: lleno }, { orgId: "org1", projectId: "p1", subdominio: "nuevo" }))
      .rejects.toMatchObject({ status: 429, message: MSG_CUPO_DIRECCIONES });
    expect(store.subdominio).toBe("el-de-antes");
    expect(deploy.publicados).toEqual([]);
  });

  it("pedir el subdominio que YA tienes no gasta cupo", async () => {
    const store = new FakeStore(); store.subdominio = "mi-web";
    let llamadas = 0;
    const cupo = async () => { llamadas++; return true; };
    const r = await cambiarSubdominio({ store, deploy: new FakeDeploy(), cupo }, { orgId: "org1", projectId: "p1", subdominio: "mi-web" });
    expect(r.subdominio).toBe("mi-web");
    expect(llamadas).toBe(0);
  });

  it("un subdominio inválido u ocupado tampoco gasta cupo", async () => {
    let llamadas = 0;
    const cupo = async () => { llamadas++; return true; };
    const store = new FakeStore(); store.ocupados.add("tomado");
    await expect(cambiarSubdominio({ store, deploy: new FakeDeploy(), cupo }, { orgId: "org1", projectId: "p1", subdominio: "MAL!" }))
      .rejects.toMatchObject({ status: 400 });
    await expect(cambiarSubdominio({ store, deploy: new FakeDeploy(), cupo }, { orgId: "org1", projectId: "p1", subdominio: "tomado" }))
      .rejects.toMatchObject({ status: 409 });
    expect(llamadas).toBe(0);
  });
});

describe("conectarDominio: hay que demostrar que el dominio es tuyo", () => {
  const entrada = {
    orgId: "org1", projectId: "p1", dominio: "sucafeteria.com",
    platformHost: "estrenala.com", sitesBaseDomain: "estrenala.com",
  };
  const siEsSuyo = async () => ({ ok: true as const, via: "a" as const });
  const noEsSuyo = async () => ({ ok: false as const, motivo: "no-apunta" as const, apuntaA: ["1.2.3.4"] });

  it("si el DNS no apunta aquí → 409 y NO se registra ni se guarda", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    let conectados = 0;
    deploy.connectDomain = async () => { conectados++; };
    await expect(conectarDominio({ store, deploy, verificar: noEsSuyo }, entrada))
      .rejects.toMatchObject({ status: 409, message: MSG_DOMINIO_SIN_VERIFICAR });
    expect(conectados).toBe(0);
    expect(store.dominio).toBeNull();
  });

  it("fallar la comprobación NO gasta cupo (el DNS tarda en propagarse)", async () => {
    let llamadas = 0;
    const cupo = async () => { llamadas++; return true; };
    await expect(conectarDominio({ store: new FakeStore(), deploy: new FakeDeploy(), verificar: noEsSuyo, cupo }, entrada))
      .rejects.toMatchObject({ status: 409 });
    expect(llamadas).toBe(0);
  });

  it("si el DNS apunta aquí, se conecta", async () => {
    const store = new FakeStore();
    const r = await conectarDominio({ store, deploy: new FakeDeploy(), verificar: siEsSuyo }, entrada);
    expect(r.dominio).toBe("sucafeteria.com");
    expect(store.dominio).toBe("sucafeteria.com");
  });

  it("sin verificador (local/autoservido) se conecta como siempre", async () => {
    const store = new FakeStore();
    const r = await conectarDominio({ store, deploy: new FakeDeploy() }, entrada);
    expect(r.dominio).toBe("sucafeteria.com");
  });

  it("verificado pero sin cupo → 429 y no se registra", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    let conectados = 0;
    deploy.connectDomain = async () => { conectados++; };
    await expect(conectarDominio({ store, deploy, verificar: siEsSuyo, cupo: async () => false }, entrada))
      .rejects.toMatchObject({ status: 429 });
    expect(conectados).toBe(0);
    expect(store.dominio).toBeNull();
  });
});
