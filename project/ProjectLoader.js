// project/ProjectLoader.js
// Projeto é sempre um arquivo .json (download/upload) — nunca localStorage,
// conforme já decidido para o game-studio. O Runtime publicado (jogo final)
// recebe o Project JSON embutido/fetchado; o Studio permite abrir/salvar.

import { withDefaults } from "./schema.js";

export const ProjectLoader = {
  // Carrega de uma URL (usado pelo runtime.html publicado, que faz fetch de
  // data/sample-project.json ou de um project.json ao lado do build final).
  async loadFromURL(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar projeto: ${url} (HTTP ${res.status})`);
    const json = await res.json();
    return withDefaults(json);
  },

  // Carrega de um <input type="file"> (usado pelo Studio, fases seguintes).
  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(withDefaults(JSON.parse(reader.result)));
        } catch (err) {
          reject(new Error("Arquivo de projeto inválido (JSON malformado): " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
      reader.readAsText(file);
    });
  },

  // Dispara o download do projeto como .json (Studio -> "Salvar").
  saveToDownload(project, filename = "ogeid-project.json") {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
