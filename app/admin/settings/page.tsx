"use client";

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Admin
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Notification Settings</h1>

          <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded mb-6">
            <h2 className="font-bold text-blue-900 mb-2">How to Configure Email Notifications:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Sign up for a free account at <a href="https://resend.com" target="_blank" rel="noopener" className="underline font-bold">resend.com</a></li>
              <li>Get your API key from the Resend dashboard</li>
              <li>Add the following to your <code className="bg-white px-2 py-1 rounded">.env.local</code> file:</li>
            </ol>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm mb-6">
            <div className="mb-2"># Email Configuration</div>
            <div>RESEND_API_KEY=re_your_api_key_here</div>
            <div>RESEND_DOMAIN=yourdomain.com</div>
            <div className="mt-4"># Who gets notified when new order submitted</div>
            <div>ADMIN_EMAIL=admin@yourbusiness.com</div>
            <div className="mt-4"># Who gets notified when order is paid (kitchen staff)</div>
            <div>KITCHEN_EMAIL=kitchen@yourbusiness.com</div>
            <div className="mt-4"># Optional: Your site URL for email links</div>
            <div>NEXT_PUBLIC_BASE_URL=https://yourdomain.com</div>
          </div>

          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-xl font-bold mb-4">Email Notification Flow:</h3>

            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <h4 className="font-bold text-yellow-900">1. Order Submitted (Pending)</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  → Notification sent to <code className="bg-white px-1">ADMIN_EMAIL</code>
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Contains: Customer info, order details, link to admin dashboard
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <h4 className="font-bold text-green-900">2. Order Marked as Paid</h4>
                <p className="text-sm text-green-800 mt-1">
                  → Notification sent to <code className="bg-white px-1">KITCHEN_EMAIL</code>
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Contains: Production sheet with ALL paid orders formatted for printing
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-gray-300 p-4 rounded mt-6">
            <h4 className="font-bold text-gray-900 mb-2">💡 Pro Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Use the same email for ADMIN_EMAIL and KITCHEN_EMAIL if you're managing both</li>
              <li>Or use different emails: manager for approvals, kitchen staff for production</li>
              <li>RESEND_DOMAIN can be "resend.dev" for testing (Resend's free domain)</li>
              <li>For production, verify your own domain in Resend for better deliverability</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded">
            <h4 className="font-bold text-red-900 mb-2">⚠️ Important:</h4>
            <p className="text-sm text-red-800">
              After updating your <code className="bg-white px-1">.env.local</code> file, restart your development server for changes to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
