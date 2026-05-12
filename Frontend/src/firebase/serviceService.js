import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';


// Filter active items and sort by sortOrder in JS (avoids composite index requirement)
function filterAndSort(docs) {
  return docs
    .map((d) => ({ ...d.data(), id: d.id }))
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

// Fetch all active services (one-time)
export async function getServices(gender = 'women') {
  const q = collection(db, "services", gender, "items")
  const snap = await getDocs(q);
  return filterAndSort(snap.docs);
}

// Real-time services listener
export function onServicesChange(gender, callback, onError) {
  const q = collection(db, "services", gender, "items")
  return onSnapshot(q, (snap) => {
    callback(filterAndSort(snap.docs));
  }, (error) => {
    console.error('Services listener error:', error);
    if (onError) onError(error); else callback([]);
  });
}

// Fetch single service
export async function getServiceById(gender, serviceId) {
  const ref = doc(db, "services", gender, "items", serviceId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Fetch full-body bundles
export async function getFullBodyBundles(gender = 'women') {
  const ref = collection(db, "bundles", gender, "items");
  const snap = await getDocs(ref);
  return filterAndSort(snap.docs);
}

export function onBundlesChange(gender, callback, onError) {
  const ref = collection(db, "bundles", gender, "items");

  return onSnapshot(ref, (snap) => {
    callback(filterAndSort(snap.docs));
  }, (error) => {
    console.error('Bundles listener error:', error);
    if (onError) onError(error); else callback([]);
  });
}

// Fetch combo packages
export async function getComboPackages(gender = 'women') {
  const ref = collection(db, "combos", gender, "items");
  const snap = await getDocs(ref);
  return filterAndSort(snap.docs);
}

export function onCombosChange(gender, callback, onError) {
  const ref = collection(db, "combos", gender, "items");

  return onSnapshot(ref, (snap) => {
    callback(filterAndSort(snap.docs));
  }, (error) => {
    console.error('Combos listener error:', error);
    if (onError) onError(error); else callback([]);
  });
}
