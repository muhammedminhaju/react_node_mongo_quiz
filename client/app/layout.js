import './globals.css';

export const metadata = {
  title: 'Quiz App',
  description: 'Responsive quiz web application with topic-based questions'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
