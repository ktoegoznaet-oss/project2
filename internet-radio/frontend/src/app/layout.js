'use client';

import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Player from '../components/Player';
import Footer from '../components/Footer';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <title>RadioWave — Интернет-радио</title>
        <meta name="description" content="Слушай музыку, заказывай песни, общайся в чате — всё на одной волне." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col bg-dark-900">
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#25262b', color: '#c1c2c5', border: '1px solid #373a40' },
              success: { iconTheme: { primary: '#51cf66', secondary: '#25262b' } },
              error: { iconTheme: { primary: '#ff6b6b', secondary: '#25262b' } },
            }}
          />
          <Navbar />
          <main className="flex-1 pb-24">{children}</main>
          <Player />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
