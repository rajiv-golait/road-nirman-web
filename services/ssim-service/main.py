"""
SSR SSIM worker — placeholder implementation.
Replace skimage compare_ssim with production pipeline; wire to Supabase service role
for writing ssim_score, ssim_pass, verification_hash (see web-dashboard/src/lib/ssim.ts).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Road Nirman SSIM Service", version="0.1.0")

SSIM_PASS_THRESHOLD = 0.75  # inverse: score < threshold => pass


class SsimRequest(BaseModel):
    ticket_id: str
    before_url: str
    after_url: str
    line_item_id: str | None = None


class SsimResponse(BaseModel):
    ticket_id: str
    line_item_id: str | None
    ssim_score: float
    ssim_pass: bool
    verification_hash: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/ssim", response_model=SsimResponse)
def compute_ssim(_body: SsimRequest):
    """
    Stub: download images, run SSIM, return hash. Implement with OpenCV/skimage
    and Supabase admin client to persist results.
    """
    raise HTTPException(
        status_code=501,
        detail="Implement image fetch + SSIM + hash; persist via Supabase service role.",
    )
