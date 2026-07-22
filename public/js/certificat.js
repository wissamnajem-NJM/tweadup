// ==================================================================
//  TWEADUP — Certificat professionnel : affichage, QR code de
//  vérification, téléchargement PDF, impression
// ==================================================================

requireRole(); // étudiant (propriétaire) ou admin

const certId = new URLSearchParams(window.location.search).get('id');
const autoDownload = new URLSearchParams(window.location.search).get('download');
let certData = null;

(async function init() {
  if (!certId) {
    document.getElementById('content').innerHTML = '<div class="form-error">❌ Certificat non précisé.</div>';
    return;
  }
  try {
    const { certificat } = await api(`/learn/certificats/${certId}`);
    certData = certificat;
    render(certificat);
    if (autoDownload) setTimeout(downloadPDF, 800);
  } catch (e) {
    document.getElementById('content').innerHTML =
      `<div class="card empty"><div class="big">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
})();

function render(c) {
  const verifyUrl = `${window.location.origin}/verify.html?code=${c.code_verification}`;
  document.getElementById('content').innerHTML = `
    <div class="certificate" id="certificate">
      <div class="cert-head">
        <div class="logo" style="color:#1b1e2e"><span class="logo-mark">🎓</span><span>Twea<em>dup</em></span></div>
        <div style="text-align:right;color:#9298ad;font-size:clamp(.55rem,1.1vw,.78rem)">
          Délivré le ${formatDate(c.date_delivrance)}<br>${c.duree_heures} heures de formation
        </div>
      </div>

      <div class="cert-title">
        <h1>Certificat de réussite</h1>
        <div class="sub">Ce certificat est fièrement décerné à</div>
      </div>

      <div class="cert-name">${esc(c.prenom)} ${esc(c.nom)}</div>
      <div class="cert-line"></div>

      <div class="cert-for">pour avoir terminé avec succès la formation et validé l'examen final de</div>
      <div class="cert-formation">« ${esc(c.formation)} »</div>
      <div class="cert-num">Certificat N° ${esc(c.numero)} — vérifiable sur tweadup.com</div>

      <div class="cert-foot">
        <div class="cert-sign">
          <div class="script">L'équipe Tweadup</div>
          <div class="bar">Signature</div>
        </div>
        <div class="cert-stamp">
          <span class="big">✔</span>
          <span>Tweadup<br>Certifié</span>
        </div>
        <div class="cert-qr">
          <div id="qrcode"></div>
          Vérifier l'authenticité
        </div>
      </div>
    </div>`;

  // QR code de vérification
  new QRCode(document.getElementById('qrcode'), {
    text: verifyUrl,
    width: 84,
    height: 84,
    correctLevel: QRCode.CorrectLevel.M
  });
}

function downloadPDF() {
  const element = document.getElementById('certificate');
  if (!element || !certData) return;
  toast('Génération du PDF…', 'info');
  html2pdf()
    .set({
      margin: 0,
      filename: `certificat-tweadup-${certData.numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    })
    .from(element)
    .save()
    .catch(() => toast('Erreur lors de la génération du PDF. Essaie Imprimer → Enregistrer en PDF.', 'error'));
}
