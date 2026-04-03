import * as React from 'react';


export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          {/* 这里可以放你的 Logo */}
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4">
            A
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Order Chat AI
          </h2>
          <p className="mt-2 text-sm text-slate-600">智能 Agent 知识库助手</p>
        </div>
        {children}
      </div>
    </div>
  );
}
