document.addEventListener("DOMContentLoaded", () => {
  //#region Variables and DOM Elements
  const sourceRadios = document.querySelectorAll('input[name="source"]');
  const githubInput = document.getElementById("github-input");
  const zipInput = document.getElementById("zip-input");
  const processBtn = document.getElementById("process-btn");
  const progressSection = document.getElementById("progress");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const statsSection = document.getElementById("stats");
  const downloadSection = document.getElementById("download-section");
  const downloadLinks = document.getElementById("download-links");
  const downloadAllBtn = document.getElementById("download-all");
  const errorMessage = document.getElementById("error-message");

  let processedFiles = [];
  let totalStats = {
    files: 0,
    lines: 0,
    chars: 0,
    tokens: 0,
    generatedFiles: 0,
  };
  //#endregion

  //#region Event Listeners
  sourceRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "github") {
        githubInput.classList.remove("hidden");
        zipInput.classList.add("hidden");
      } else {
        githubInput.classList.add("hidden");
        zipInput.classList.remove("hidden");
      }
    });
  });

  processBtn.addEventListener("click", async () => {
    const sourceType = document.querySelector(
      'input[name="source"]:checked'
    ).value;
    const extensionsInput = document.getElementById("extensions").value;
    const chunkSize = parseInt(document.getElementById("chunk-size").value, 10);

    if (chunkSize < 10000) {
      showError("O tamanho mínimo do chunk deve ser 10.000 caracteres");
      return;
    }

    if (!extensionsInput) {
      showError("Informe pelo menos uma extensão de arquivo");
      return;
    }

    let zipFile = null;

    if (sourceType === "github") {
      const githubUrl = document.getElementById("github-url").value.trim();
      const branch =
        document.getElementById("github-branch").value.trim() || "main";

      if (!githubUrl) {
        showError("Informe uma URL do GitHub válida");
        return;
      }

      zipFile = await downloadGitHubRepo(githubUrl, branch);
      if (!zipFile) return;
    } else {
      const fileInput = document.getElementById("zip-file");
      if (!fileInput.files || fileInput.files.length === 0) {
        showError("Selecione um arquivo ZIP");
        return;
      }

      zipFile = fileInput.files[0];
    }

    await processZipFile(zipFile, extensionsInput, chunkSize);
  });

  downloadAllBtn.addEventListener("click", () => {
    const zip = new JSZip();

    processedFiles.forEach((file) => {
      zip.file(file.name, file.content);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "code-chunks.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
  //#endregion

  //#region Utility Functions
  function countTokens(text) {
    try {
      const { encode } = GPTTokenizer_cl100k_base;
      return encode(text).length;
    } catch (e) {
      console.error("Erro ao contar tokens:", e);
      return text.length / 4; // Estimativa aproximada como fallback
    }
  }

  function processFile(filePath, content) {
    const lines = content.split("\n");
    const tokens = countTokens(content);

    const contentWithLineNumber = lines
      .map((line, index) => `${index + 1}: ${line}`)
      .join("\n");

    return {
      path: filePath,
      content: `------------- File: ${filePath} -------------\n${contentWithLineNumber}\n`,
      chars: content.length,
      lines: lines.length,
      tokens: tokens,
    };
  }

  function shouldIgnoreFile(filePath, extensions) {
    const ext = "." + filePath.split(".").pop().toLowerCase();
    if (!extensions.includes(ext)) return true;

    return false;
  }
  //#endregion

  //#region Core Functions
  async function processZipFile(file, extensions, chunkSize) {
    resetUI();
    showProgress("Carregando arquivo ZIP...");

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const files = [];

      let fileCount = 0;
      loadedZip.forEach((_, zipEntry) => {
        if (!zipEntry.dir) fileCount++;
      });

      let processedCount = 0;
      const extensionsArray = extensions.split(",").map((ext) => ext.trim());

      const promises = [];
      loadedZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = (async () => {
            if (!shouldIgnoreFile(relativePath, extensionsArray)) {
              const content = await zipEntry.async("string");
              const fileStats = processFile(relativePath, content);
              files.push(fileStats);

              totalStats.files++;
              totalStats.lines += fileStats.lines;
              totalStats.chars += fileStats.chars;
              totalStats.tokens += fileStats.tokens;
            }

            processedCount++;
            updateProgress(
              processedCount,
              fileCount,
              "Processando arquivos..."
            );
          })();

          promises.push(promise);
        }
      });

      await Promise.all(promises);
      generateOutputFiles(files, chunkSize);
    } catch (error) {
      console.log(error);
      showError("Erro ao processar o arquivo ZIP: " + error.message);
    }
  }

  async function downloadGitHubRepo(url, branch = null) {
    resetUI();
    showProgress("Baixando repositório do GitHub...");

    try {
      // Altere a URL do proxy para o seu servidor local ou remoto (supabase functions)
      const proxyUrl = "https://hrhvqkvpnnyqalrsnqup.supabase.co/functions/v1/download-github-repo";
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          branch,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Erro ao baixar via proxy: ${response.status} ${response.statusText}`
        );
      }
      const blob = await response.blob();

      return new File([blob], "repo.zip", { type: "application/zip" });
    } catch (error) {
      showError("Erro ao baixar o repositório: " + error.message);
      return null;
    }
  }

  function generateOutputFiles(files, chunkSize) {
    showProgress("Gerando arquivos de saída...");

    let bigFileContent = "";
    let currentSize = 0;
    let fileIndex = 0;
    const outputFiles = [];

    files.forEach((file) => {
      if (currentSize + file.content.length > chunkSize && currentSize > 0) {
        outputFiles.push({
          name: `code-chunk-${fileIndex}.txt`,
          content: bigFileContent,
        });

        bigFileContent = "";
        currentSize = 0;
        fileIndex++;
      }

      bigFileContent += file.content;
      currentSize += file.content.length;
    });

    if (currentSize > 0) {
      outputFiles.push({
        name: `code-chunk-${fileIndex}.txt`,
        content: bigFileContent,
      });
    }

    totalStats.generatedFiles = outputFiles.length;
    processedFiles = outputFiles;

    showResults();
  }
  //#endregion

  //#region UI Functions
  function resetUI() {
    errorMessage.classList.add("hidden");
    statsSection.classList.add("hidden");
    downloadSection.classList.add("hidden");
    hideProgress();

    totalStats = {
      files: 0,
      lines: 0,
      chars: 0,
      tokens: 0,
      generatedFiles: 0,
    };
    processedFiles = [];
  }

  function showProgress(message) {
    progressSection.classList.remove("hidden");
    progressText.textContent = message;
  }

  function updateProgress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${message} (${current}/${total}, ${percentage}%)`;
  }

  function hideProgress() {
    progressSection.classList.add("hidden");
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    hideProgress();
  }

  function showResults() {
    hideProgress();

    document.getElementById("total-files").textContent = totalStats.files;
    document.getElementById("total-lines").textContent =
      totalStats.lines.toLocaleString();
    document.getElementById("total-chars").textContent =
      totalStats.chars.toLocaleString();
    document.getElementById("total-tokens").textContent =
      totalStats.tokens.toLocaleString();
    document.getElementById("generated-files").textContent =
      totalStats.generatedFiles;

    statsSection.classList.remove("hidden");

    downloadLinks.innerHTML = "";
    processedFiles.forEach((file, index) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const div = document.createElement("div");
      div.className = "flex items-center";

      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.className = "text-blue-600 hover:underline flex-grow";
      link.textContent = `${file.name} (${Math.round(
        file.content.length / 1024
      )} KB)`;

      const sizeSpan = document.createElement("span");
      sizeSpan.className = "text-gray-500 text-sm";
      sizeSpan.textContent = `~${Math.round(
        countTokens(file.content) / 1000
      )}K tokens`;

      div.appendChild(link);
      div.appendChild(sizeSpan);
      downloadLinks.appendChild(div);
    });

    downloadSection.classList.remove("hidden");
  }
  //#endregion
});
