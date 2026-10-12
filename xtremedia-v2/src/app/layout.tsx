import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AudioPlayerProvider } from '@/context/AudioPlayerContext';
import PlayerBar from '@/components/PlayerBar';
import LyricModal from '@/components/LyricModal';
import QueueDrawer from '@/components/QueueDrawer';
import GiftModal from '@/components/GiftModal';
import AuthModal from '@/components/AuthModal';

export const metadata: Metadata = {
  title: 'XtreMedia V2 - Nền Tảng Âm Nhạc Trực Tuyến Hiện Đại',
  description:
    'Phiên bản hiện đại hóa toàn diện của XtreMedia CMS với Core Audio Engine HTML5, Karaoke LRC Sync, thiết kế Cyber Acoustic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <AudioPlayerProvider>
            {children}
            <PlayerBar />
            <LyricModal />
            <QueueDrawer />
            <GiftModal />
            <AuthModal />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
