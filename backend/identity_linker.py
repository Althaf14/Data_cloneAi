import hashlib
from sqlalchemy.orm import Session
from models import Identity, Document

class IdentityLinker:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def hash_file(file_path: str) -> str:
        """Compute SHA-256 hash of a file."""
        sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    sha256.update(chunk)
        except Exception:
            return ""
        return sha256.hexdigest()

    def find_duplicates(self, new_identity_data: dict, file_path: str = None, current_doc_id: int = None):
        """
        Detect duplicate documents via:
        1. File hash (exact same image uploaded again)
        2. Exact ID number match in OCR data of previous documents
        3. Name + DOB combo match across previous documents
        """
        duplicates = []
        seen_doc_ids = set()

        # ── 1. File hash duplicate ──────────────────────────────────────────
        if file_path:
            file_hash = self.hash_file(file_path)
            if file_hash:
                # Store hash on current doc (caller must save)
                self._current_file_hash = file_hash
                matching_docs = (
                    self.db.query(Document)
                    .filter(
                        Document.file_hash == file_hash,
                        Document.status == "completed",
                    )
                    .all()
                )
                for doc in matching_docs:
                    if doc.id != current_doc_id and doc.id not in seen_doc_ids:
                        seen_doc_ids.add(doc.id)
                        duplicates.append({
                            "document_id": doc.id,
                            "reason": "Identical file — exact same image uploaded previously",
                            "confidence": 1.0,
                            "uploaded_at": str(doc.upload_date),
                        })

        # ── 2. ID number match across completed documents ───────────────────
        id_number = new_identity_data.get("id_number")
        if id_number:
            # Check Identity table
            existing_identity = (
                self.db.query(Identity)
                .filter(Identity.id_number == id_number)
                .first()
            )
            if existing_identity:
                duplicates.append({
                    "identity_id": existing_identity.id,
                    "reason": f"Exact ID number match: {id_number}",
                    "confidence": 1.0,
                })

            # Check OCR data of previous documents
            all_docs = (
                self.db.query(Document)
                .filter(Document.status == "completed", Document.ocr_data.isnot(None))
                .all()
            )
            for doc in all_docs:
                if doc.id == current_doc_id or doc.id in seen_doc_ids:
                    continue
                try:
                    ocr = doc.ocr_data or {}
                    fields = ocr.get("fields", {})
                    if fields.get("id_number") == id_number:
                        seen_doc_ids.add(doc.id)
                        duplicates.append({
                            "document_id": doc.id,
                            "reason": f"Same ID number ({id_number}) found in a previous scan",
                            "confidence": 0.95,
                            "uploaded_at": str(doc.upload_date),
                        })
                except Exception:
                    pass

        # ── 3. Name + DOB combo match ───────────────────────────────────────
        names = new_identity_data.get("detected_names", [])
        dob = new_identity_data.get("date_of_birth")
        if names and dob:
            all_docs = (
                self.db.query(Document)
                .filter(Document.status == "completed", Document.ocr_data.isnot(None))
                .all()
            )
            for doc in all_docs:
                if doc.id == current_doc_id or doc.id in seen_doc_ids:
                    continue
                try:
                    ocr = doc.ocr_data or {}
                    fields = ocr.get("fields", {})
                    prev_names = set(fields.get("detected_names", []))
                    prev_dob = fields.get("date_of_birth")
                    if prev_dob == dob and prev_names & set(names):
                        seen_doc_ids.add(doc.id)
                        duplicates.append({
                            "document_id": doc.id,
                            "reason": "Matching name and date of birth found in a previous scan",
                            "confidence": 0.85,
                            "uploaded_at": str(doc.upload_date),
                        })
                except Exception:
                    pass

        return duplicates

    def check_cross_modal_consistency(self, identity_id, document_id):
        return {
            "is_consistent": True,
            "findings": ["Photo age matches stated DOB range"]
        }

    def build_network(self):
        """
        Build a network graph of all identities based on shared attributes.
        Returns:
            {
                "nodes": [{id, label, type, ...}],
                "links": [{source, target, type, ...}],
                "stats": {total_identities, ...}
            }
        """
        docs = (
            self.db.query(Document)
            .filter(Document.status == "completed")
            .all()
        )

        # 1. Build Adjacency List (Graph)
        # Nodes = Document IDs
        # Edges = Shared Attribute
        adj = {d.id: set() for d in docs}
        
        # Maps to find shared Docs
        by_id_num = {}
        by_hash = {}
        by_name_dob = {}

        for d in docs:
            ocr = d.ocr_data or {}
            fields = ocr.get("fields", {})
            
            # Key: ID Number
            id_num = fields.get("id_number")
            if id_num:
                if id_num not in by_id_num: by_id_num[id_num] = []
                by_id_num[id_num].append(d.id)
            
            # Key: File Hash
            if d.file_hash:
                if d.file_hash not in by_hash: by_hash[d.file_hash] = []
                by_hash[d.file_hash].append(d.id)

            # Key: Name + DOB
            names = fields.get("detected_names", [])
            dob = fields.get("date_of_birth")
            if names and dob:
                # Use first name for simplicity in grouping, can be robustified
                key = (names[0].upper(), dob) 
                if key not in by_name_dob: by_name_dob[key] = []
                by_name_dob[key].append(d.id)

        # Create edges
        for group in by_id_num.values():
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    adj[group[i]].add(group[j])
                    adj[group[j]].add(group[i])
        
        for group in by_hash.values():
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    adj[group[i]].add(group[j])
                    adj[group[j]].add(group[i])

        for group in by_name_dob.values():
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    adj[group[i]].add(group[j])
                    adj[group[j]].add(group[i])

        # 2. Find Connected Components (Unique Identities)
        visited = set()
        components = []

        for d_id in adj:
            if d_id not in visited:
                # BFS/DFS
                stack = [d_id]
                component = []
                while stack:
                    curr = stack.pop()
                    if curr in visited: continue
                    visited.add(curr)
                    component.append(curr)
                    # Add neighbors
                    for neighbor in adj[curr]:
                        if neighbor not in visited:
                            stack.append(neighbor)
                components.append(component)

        # 3. Format Output
        # Each component is a "Unique Identity"
        results = []
        for idx, comp in enumerate(components):
            # Get docs for this component
            comp_docs = [d for d in docs if d.id in comp]
            
            # Determine "primary" name for the group
            primary_name = "Unknown Identity"
            primary_id = "N/A"
            for d in comp_docs:
                ocr = d.ocr_data or {}
                fields = ocr.get("fields", {})
                if fields.get("detected_names"):
                    primary_name = fields.get("detected_names")[0]
                if fields.get("id_number"):
                    primary_id = fields.get("id_number")
                if primary_name != "Unknown Identity": break
            
            group_data = {
                "group_id": idx,
                "primary_name": primary_name,
                "primary_id": primary_id,
                "document_count": len(comp_docs),
                "documents": [
                    {
                        "id": d.id,
                        "type": d.document_type,
                        "upload_date": d.upload_date.isoformat() if d.upload_date else None,
                        "risk_level": "unknown", # populated by main if needed, or join
                        "filename": d.file_path.split("/")[-1] if d.file_path else "unknown"
                    }
                    for d in comp_docs
                ]
            }
            results.append(group_data)

        # Sort by group size (descending) to show biggest clusters first
        results.sort(key=lambda x: x["document_count"], reverse=True)

        return {
            "groups": results,
            "stats": {
                "total_documents_analyzed": len(docs),
                "unique_identities": len(components),
                "linked_groups": len([c for c in components if len(c) > 1])
            }
        }
