import "@/styles/globals.css";
import 'antd/dist/reset.css';
import type { AppProps } from "next/app";
import { AuthProvider } from '../context/AuthContext';
import { ErrorProvider } from '../context/ErrorContext';
import Layout from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorProvider>
  );
}
