// 儲存 adapter：{ read(): string | null, write(text) }。

// 記憶體版，測試用。
export function memoryAdapter(initial = null) {
  let text = initial;
  return {
    read: () => text,
    write: (next) => {
      text = next;
    },
  };
}

// 瀏覽器 localStorage 版。私隱模式等情況讀唔到、存唔到，今次照用就算。
export function localStorageAdapter(key) {
  return {
    read() {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(text) {
      try {
        localStorage.setItem(key, text);
      } catch {
        // 存唔到，今次照用就算
      }
    },
  };
}
