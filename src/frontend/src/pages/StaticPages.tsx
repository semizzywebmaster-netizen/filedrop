import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"

function StaticLayout({ title, onNav, children }: { title: string; onNav: any; children: React.ReactNode }) {
  return <div className="min-h-screen bg-white"><Header onNav={onNav} /><div className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl font-bold mb-6">{title}</h1><Card><CardContent className="p-8 prose prose-zinc max-w-none text-sm leading-relaxed">{children}</CardContent></Card></div></div>
}

export const SecurityPage = ({ onNav }: { onNav: any }) => <StaticLayout title="Security" onNav={onNav}><p><strong>Cloudflare-first:</strong> R2 encryption at rest AES-256, TLS in transit.</p><ul className="list-disc pl-5"><li>Tokens use cryptographically random identifiers and are never sequential</li><li>Passwords use bcryptjs hashing and are never stored plaintext</li><li>JWT HTTP-only secure cookies with SameSite Lax</li><li>Rate limiting for uploads and downloads per IP via D1</li><li>Files are streamed rather than buffered in full</li><li>Cron cleanup removes expired R2 objects and D1 rows</li></ul></StaticLayout>

export const FeaturesPage = ({ onNav }: { onNav: any }) => <StaticLayout title="Features" onNav={onNav}><ul className="list-disc pl-5 space-y-2"><li>Drag &amp; drop and multi-file transfers</li><li>Chunked resumable uploads with automatic retry</li><li>Secure shareable links at /d/:token</li><li>Expiry, download limits, and password protection</li><li>Email share, message, and ZIP-all download</li><li>Dashboard, download analytics, and history</li><li>Guest uploads with owner token</li><li>API with key authentication</li></ul></StaticLayout>

export const HowItWorksPage = ({ onNav }: { onNav: any }) => <StaticLayout title="How it works" onNav={onNav}><ol className="list-decimal pl-5 space-y-2"><li>Upload files in resumable chunks to R2</li><li>Transfer metadata is created in D1 with a secure token</li><li>A /d/:token link is generated</li><li>Share the link anywhere</li><li>The recipient opens the link and passes any required access checks</li><li>The Worker streams the file from R2 without exposing storage credentials</li><li>Download activity is recorded</li><li>Cron checks expiry and limits, then removes expired objects and rows</li></ol></StaticLayout>

export const PrivacyPage = ({ onNav }: { onNav: any }) => <StaticLayout title="Privacy" onNav={onNav}><p>We store files temporarily. Files are automatically deleted after expiry. We do not scan file content. Limited metadata may be retained for abuse prevention and operational security.</p></StaticLayout>

export const TermsPage = ({ onNav }: { onNav: any }) => <StaticLayout title="Terms" onNav={onNav}><p>Use FileDrop only for lawful file transfers. Do not upload content that violates applicable law or the rights of others. Abuse, malware, and prohibited content may be removed.</p></StaticLayout>
