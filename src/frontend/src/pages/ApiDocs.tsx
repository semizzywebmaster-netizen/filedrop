export function ApiDocs() {
  return <div className="p-6 text-sm"><h1 className="text-xl font-bold">API Docs</h1><pre className="mt-4 bg-zinc-900 text-white p-4 rounded-xl overflow-auto">{`
POST /api/auth/register {name,email,password}
POST /api/auth/login {email,password}
GET /api/auth/me
POST /api/transfers {files:[{name,size,type}], expiryDays, password, maxDownloads, emailTo, message}
GET /api/transfers (auth)
GET /api/transfers/t/:token
POST /api/transfers/t/:token/unlock {password}
POST /api/transfers/:id/finalize
POST /api/upload/chunk FormData{chunk, index, total, filename, transferId}
GET /api/download/:token/:fileId?p=password
GET /api/cron/cleanup?secret=CRON_SECRET
GET /api/health
GET /api/stats
`}</pre></div>
}
