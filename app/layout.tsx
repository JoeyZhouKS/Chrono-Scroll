import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://chronoscroll.history"),
  title: {
    default: "历史长河 ChronoScroll - 交互式世界历史时间轴",
    template: "%s | 历史长河 ChronoScroll"
  },
  description: "探索从公元前3000年到2026年的世界历史长河。交互式时间轴展示中国朝代更迭、世界大战、科技革命、文化变迁等数千年的重大历史事件。支持按类别筛选、快速跳转任意年份，沉浸式浏览人类文明演进历程。",
  keywords: [
    "历史时间轴",
    "世界历史",
    "中国历史",
    "朝代更迭",
    "历史事件",
    "交互式时间轴",
    "timeline",
    "world history",
    "china history",
    "历史可视化",
    "文明演进",
    "历史教育",
    "公元前",
    "古代文明",
    "现代历史"
  ],
  authors: [{ name: "ChronoScroll" }],
  creator: "ChronoScroll",
  publisher: "ChronoScroll",
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://chronoscroll.history",
    siteName: "历史长河 ChronoScroll",
    title: "历史长河 ChronoScroll - 交互式世界历史时间轴",
    description: "从公元前3000年到2026年，探索跨越5000年的世界历史长河。可视化时间轴呈现中国朝代、世界大战、科技革命等数千个历史事件。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "历史长河 ChronoScroll - 世界历史时间轴可视化"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "历史长河 ChronoScroll - 交互式世界历史时间轴",
    description: "从公元前3000年到2026年，探索跨越5000年的世界历史长河。",
    images: ["/og-image.png"],
    creator: "@chronoscroll"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: "/apple-icon.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f0df" },
    { media: "(prefers-color-scheme: dark)", color: "#2f2a22" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "历史长河 ChronoScroll",
    "description": "交互式世界历史时间轴，展示从公元前3000年到2026年的5000年历史事件",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "url": "https://chronoscroll.history",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "creator": {
      "@type": "Organization",
      "name": "ChronoScroll"
    }
  };

  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
