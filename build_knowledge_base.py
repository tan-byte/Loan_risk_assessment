import json
import os

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except ImportError:
    chromadb = None
    SentenceTransformer = None

policy_facts = [
    "Personal Loan Salaried: Minimum age is 21, Maximum age is 60. Minimum CIBIL score is 730. Minimum monthly income required is 25000 INR.",
    "Personal Loan Salaried Documents: PAN Card, Aadhaar Card, Last 3 Months Salary Slips, 6 Months Bank Statement.",
    "Personal Loan Self-Employed: Minimum age is 25, Maximum age is 65. Minimum CIBIL score is 730. Minimum annual income required is 480000 INR.",
    "Home Loan Policies: Maximum tenure is 30 years. LTV (Loan to Value) is capped at 80% to 90%.",
    "Rajasthan Regional Policy: Rural applicants require an 'Agricultural Land-Use Certificate' for property collateral.",
    "Maharashtra Regional Policy: Additional 1% cess/stamp duty applicable on Mumbai/Pune urban properties.",
    "Karnataka Regional Policy: Electronic signatures and E-stamping are mandatory for all loan agreements."
]


def build_knowledge_base():
    if chromadb is None or SentenceTransformer is None:
        raise RuntimeError(
            "Missing AI knowledge dependencies. Install chromadb and sentence-transformers to build the knowledge base."
        )

    if os.path.exists("./indus_knowledge_db"):
        print("Knowledge base already exists at ./indus_knowledge_db. Skipping build.")
        return

    print("1. Loading Embedding Model (This might take a few seconds...)")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    print("2. Preparing IndusCredit Policies...")
    print("3. Creating the Vector Database Folder...")
    chroma_client = chromadb.PersistentClient(path="./indus_knowledge_db")

    collection = chroma_client.get_or_create_collection(name="bank_policies")

    print("4. Embedding and Saving Policies...")
    collection.add(
        documents=policy_facts,
        ids=[f"policy_{i}" for i in range(len(policy_facts))]
    )

    print("
✅ SUCCESS! Knowledge base saved to ./indus_knowledge_db")


if __name__ == "__main__":
    build_knowledge_base()
