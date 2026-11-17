(() => {
  const workerURL = new URL("cross-worker.js", document.currentScript.src);
  const pending = new Map();
  let worker,
    sequence = 0,
    warmupJob;
  function request(data) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        worker = new Worker(workerURL, { type: "module" });
        worker.onmessage = ({ data }) => {
          const job = pending.get(data.id);
          if (!job) return;
          pending.delete(data.id);
          if (data.error) job.reject(new Error(data.error));
          else job.resolve(data.value);
        };
        worker.onerror = () => {
          for (const job of pending.values())
            job.reject(new Error("Cross 求解模块加载失败，请重试。"));
          pending.clear();
          worker.terminate();
          worker = null;
          warmupJob = null;
        };
      }
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      try {
        worker.postMessage({ ...data, id });
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
  }
  window.CrossSolver = {
    solveBest: (scramble, color) => request({ type: "solve", scramble, color }),
    solveXCross: (scramble, color) =>
      request({ type: "xcross", scramble, color }),
    warmup: () =>
      (warmupJob ||= request({ type: "warmup" }).catch((error) => {
        warmupJob = null;
        throw error;
      })),
  };
  const warmup = () => window.CrossSolver.warmup().catch(() => {});
  if (window.requestIdleCallback)
    requestIdleCallback(warmup, { timeout: 1500 });
  else setTimeout(warmup, 0);
})();
