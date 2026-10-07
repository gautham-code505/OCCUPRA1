import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.database.firebase import get_firestore_client, is_firebase_active

logger = logging.getLogger(__name__)


class BaseRepository:
    """
    Base repository that interacts with Firebase Firestore when credentials
    are active, or falls back to an in-memory dictionary store.
    """
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._memory_store: Dict[str, Dict[str, Any]] = {}

    def get_collection(self):
        client = get_firestore_client()
        if is_firebase_active() and client:
            return client.collection(self.collection_name)
        return None

    async def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        client = get_firestore_client()
        if is_firebase_active() and client:
            doc_ref = client.collection(self.collection_name).document(doc_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["id"] = doc.id
                return data
            return None
        return self._memory_store.get(doc_id)

    async def get_all(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        client = get_firestore_client()
        if is_firebase_active() and client:
            query = client.collection(self.collection_name)
            if limit:
                query = query.limit(limit)
            docs = query.stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        
        items = list(self._memory_store.values())
        if limit:
            return items[:limit]
        return items

    async def set(self, doc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data_to_store = dict(data)
        data_to_store["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "id" not in data_to_store:
            data_to_store["id"] = doc_id

        client = get_firestore_client()
        if is_firebase_active() and client:
            client.collection(self.collection_name).document(doc_id).set(data_to_store, merge=True)
        else:
            self._memory_store[doc_id] = data_to_store

        return data_to_store

    async def add(self, data: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = data.get("id") or str(len(self._memory_store) + 1)
        data_to_store = dict(data)
        data_to_store["id"] = doc_id
        data_to_store["created_at"] = datetime.now(timezone.utc).isoformat()
        data_to_store["updated_at"] = datetime.now(timezone.utc).isoformat()

        client = get_firestore_client()
        if is_firebase_active() and client:
            _, doc_ref = client.collection(self.collection_name).add(data_to_store)
            data_to_store["id"] = doc_ref.id
        else:
            self._memory_store[doc_id] = data_to_store

        return data_to_store

    async def update(self, doc_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        client = get_firestore_client()
        if is_firebase_active() and client:
            doc_ref = client.collection(self.collection_name).document(doc_id)
            doc_ref.update(data)
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                res = updated_doc.to_dict()
                res["id"] = updated_doc.id
                return res
            return None
        
        if doc_id in self._memory_store:
            self._memory_store[doc_id].update(data)
            self._memory_store[doc_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            return self._memory_store[doc_id]
        return None

    async def delete(self, doc_id: str) -> bool:
        client = get_firestore_client()
        if is_firebase_active() and client:
            client.collection(self.collection_name).document(doc_id).delete()
            return True
        
        if doc_id in self._memory_store:
            del self._memory_store[doc_id]
            return True
        return False
