import './globals.css';
import { ThemeProvider } from '../components/ThemeContext';

export const metadata = {
  title: 'ConnectHub — The Twitter & Instagram Social Experience',
  description: 'Share your world, find your tribe, and connect with people who inspire you.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" data-dark-style="twitter" data-accent="blue">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
