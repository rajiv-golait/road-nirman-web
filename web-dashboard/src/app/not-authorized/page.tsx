import Link from 'next/link';

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-800 via-primary to-primary-600 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-6">
          <span className="material-symbols-outlined text-white/80" style={{ fontSize: 40 }}>
            phone_android
          </span>
        </div>
        <h1 className="font-headline font-black text-3xl text-white mb-3">
          Mobile App Only
        </h1>
        <p className="text-primary-200 text-sm max-w-md mx-auto mb-8">
          Your account role (Citizen, Contractor, or Mukadam) is designed for the
          mobile application. The web dashboard is available for administrative and
          engineering roles only.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/20"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
