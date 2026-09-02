import { redirect } from 'next/navigation';

// Entry point — redirect to login screen
export default function RootPage() {
  redirect('/login-screen');
}
