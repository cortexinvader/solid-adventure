import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documents as documentsApi } from '@/lib/api'
import Header from '@/components/Header'
import { Upload, Download, FileText } from 'lucide-react'
import { format } from 'date-fns'

export default function Documents() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [watermark, setWatermark] = useState(false)

  const { data: docs } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await documentsApi.getAll()
      return response.data.documents
    }
  })

  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; watermark: boolean }) =>
      documentsApi.upload(data.file, data.watermark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setFile(null)
      setWatermark(false)
    }
  })

  const handleUpload = () => {
    if (!file) return
    uploadMutation.mutate({ file, watermark })
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text mb-6">Documents</h1>

        <div className="bg-surface rounded-lg p-6 mb-8 border border-border">
          <h2 className="text-xl font-semibold text-text mb-4">Upload Document</h2>
          <div className="space-y-4">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-text"
            />
            <label className="flex items-center gap-2 text-text">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
                className="w-4 h-4"
              />
              Add watermark
            </label>
            <button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
              className="px-6 py-2 bg-accent text-bg rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload size={20} />
              Upload
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text">Uploaded Documents</h2>

          {docs?.map((doc: any) => (
            <div
              key={doc.id}
              className="bg-surface rounded-lg p-6 border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <FileText size={32} className="text-accent" />
                <div>
                  <h3 className="font-semibold text-text">{doc.filename}</h3>
                  <p className="text-sm text-text-muted">
                    Uploaded by {doc.owner_username} on{' '}
                    {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                  </p>
                  {doc.watermark && (
                    <span className="text-xs text-accent">Watermarked</span>
                  )}
                </div>
              </div>
              <a
                href={documentsApi.download(doc.id)}
                download
                className="px-4 py-2 bg-accent text-bg rounded-lg hover:opacity-90 flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </a>
            </div>
          ))}

          {docs?.length === 0 && (
            <p className="text-center text-text-muted py-8">No documents yet</p>
          )}
        </div>
      </main>
    </div>
  )
}
