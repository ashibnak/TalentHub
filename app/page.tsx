import { redirect } from 'next/navigation';

export default function Home() {
  // Phase 1 preview: the demo profile is the only page, so land there directly.
  redirect('/u/sara-karimi');
}
