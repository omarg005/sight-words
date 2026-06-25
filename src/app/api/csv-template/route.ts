export function GET() {
  const csv = `word,image_url\nthe,\nand,\na,https://example.com/optional-image.jpg\n`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sight-words-template.csv"',
    },
  })
}
