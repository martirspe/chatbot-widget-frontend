export function generateDocsHtml(docs: any[]): string {
  const uniqueDocs = Array.from(
    new Map(docs.map((doc: any) => [doc.text + doc.source, doc])).values()
  );
  return uniqueDocs.map((doc: any) =>
    `<div style="margin-bottom:8px;">
      <div style="font-weight:600; color:#1d4ed8;">${doc.title || doc.text?.slice(0, 40) || 'Documento'}</div>
      <div style="color:#059669;">${doc.subtitle || doc.text?.slice(0, 60) || ''}</div>
      <a href="${doc.source}" target="_blank" style="color:#2563eb; font-size:14px;">${doc.source}</a>
    </div>`
  ).join('');
}
