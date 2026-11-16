export type LearnedReference = {
  id: string;
  name: string;
  type: string;
  content: string;
  summary?: string;
};

const DATABASE_NAME = "notification-learning-library";
const STORE_NAME = "references";
const LEGACY_STORAGE_KEY = "notification-learning-library";

type LegacyReference = {
  name?: unknown;
  type?: unknown;
  summary?: unknown;
  guidance?: unknown;
  examples?: unknown;
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the learning library"));
  });

const getAllReferences = async () => {
  const database = await openDatabase();
  return new Promise<LearnedReference[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll() as IDBRequest<LearnedReference[]>;
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not read the learning library"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not read the learning library"));
    };
  });
};

const saveReferences = async (references: LearnedReference[]) => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    references.forEach((reference) => store.put(reference));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save the learning library"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save the learning library"));
    };
  });
};

const migrateLegacyReferences = async () => {
  const saved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return [];

  const legacyReferences: unknown = JSON.parse(saved);
  if (!Array.isArray(legacyReferences)) {
    throw new Error("The saved learning library has an invalid format");
  }

  const references = legacyReferences.map((value, index): LearnedReference => {
    const reference = value as LegacyReference;
    const name = typeof reference.name === "string" ? reference.name : `Reference ${index + 1}`;
    const summary = typeof reference.summary === "string" ? reference.summary : "";
    const guidance = typeof reference.guidance === "string" ? reference.guidance : "";
    const examples = Array.isArray(reference.examples)
      ? reference.examples.filter((example): example is string => typeof example === "string")
      : [];
    return {
      id: `migrated-${index}-${name}`,
      name,
      type: typeof reference.type === "string" ? reference.type : "legacy",
      summary,
      content: [summary, guidance, ...examples].filter(Boolean).join("\n\n"),
    };
  });

  await saveReferences(references);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return references;
};

export async function listLearnedReferences() {
  const references = await getAllReferences();
  if (references.length > 0) return references;
  return migrateLegacyReferences();
}

export async function saveLearnedReference(reference: LearnedReference) {
  await saveReferences([reference]);
}

export async function removeLearnedReference(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not remove the learning reference"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not remove the learning reference"));
    };
  });
}
