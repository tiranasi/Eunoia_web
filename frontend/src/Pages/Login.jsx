import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import logo from '@/pic/ENOUIA.png';
import { useTranslation, languageOptions } from '@/i18n';
import { Globe } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t, lang, changeLanguage } = useTranslation();

  useEffect(() => {
    try {
      if (localStorage.getItem('token')) {
        navigate(createPageUrl('EunoiaHome'));
      }
    } catch (_) {}
  }, [navigate]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { alert(t('login.errorMissing')); return; }
    try {
      const data = await base44.auth.login({ email, password });
      if (data?.role) {
        try { localStorage.setItem('role', data.role); } catch {}
      }
      navigate(createPageUrl('EunoiaHome'));
    } catch (e) {
      alert(e.message || t('login.errorFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/60 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card className="p-6 rounded-3xl shadow-sm border-0">
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Globe className="w-4 h-4" />
              <select
                className="h-8 rounded-full border border-gray-200 px-3 text-xs bg-gray-50"
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                {languageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-center mb-6">
            <img src={logo} alt="Eunoia" className="w-12 h-12 rounded-3xl mx-auto mb-3 object-contain bg-white" />
            <h1 className="text-xl font-bold text-gray-900">{t('login.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('login.subtitle')}</p>
            <p className="text-xs text-gray-600 mt-1">{t('login.tagline')}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">{t('login.emailLabel')}</label>
              <input
                className="w-full rounded-2xl border border-gray-200 h-11 px-3 bg-gray-50 focus:bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.placeholderEmail')}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">{t('login.passwordLabel')}</label>
              <input
                type="password"
                className="w-full rounded-2xl border border-gray-200 h-11 px-3 bg-gray-50 focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.placeholderPassword')}
              />
            </div>
            <Button className="w-full h-11 rounded-2xl bg-teal-500 hover:bg-teal-600 mt-2" onClick={handleLogin}>
              {t('login.submit')}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              {t('login.registerPrompt')}{' '}
              <Link to={createPageUrl('Register')} className="text-teal-600">
                {t('login.registerLink')}
              </Link>
            </p>
          </div>
        </Card>
        <p className="text-center text-xs text-gray-500 mt-4">{t('login.footer')}</p>
      </div>
    </div>
  );
}
