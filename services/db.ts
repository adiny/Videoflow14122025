
const DB_NAME = 'VideoFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is supported
    if (!('indexedDB' in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllProjects = async (): Promise<any[]> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("DB Error get all", e);
      return [];
  }
};

export const saveProjectToDB = async (project: any) => {
  try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("DB Error save", e);
  }
};

export const deleteProjectFromDB = async (id: string) => {
  try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("DB Error delete", e);
  }
};
