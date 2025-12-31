'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function PreviewIconPage() {
  const [copied, setCopied] = useState(false);

  const downloadSVG = (path: string, filename: string) => {
    fetch(path)
      .then(response => response.text())
      .then(svg => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}>
            🎨 ArtisScan Icons
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>
            Aperçu des icônes professionnelles
          </p>
        </div>

        {/* Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Icon 1 - Transparent */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#f8fafc', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              🌐 Version Transparente
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
              Pour web et interfaces
            </p>
            <div style={{
              background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
              minHeight: '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Image 
                src="/icon.svg" 
                alt="ArtisScan Icon" 
                width={200} 
                height={200}
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            <button 
              onClick={() => downloadSVG('/icon.svg', 'artisscan-icon.svg')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              📥 Télécharger SVG
            </button>
          </div>

          {/* Icon 2 - Rounded */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#f8fafc', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              📱 Version Arrondie
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
              Pour iOS/Android avec animation
            </p>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
              minHeight: '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Image 
                src="/icon-rounded.svg" 
                alt="ArtisScan Icon Rounded" 
                width={200} 
                height={200}
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            <button 
              onClick={() => downloadSVG('/icon-rounded.svg', 'artisscan-icon-rounded.svg')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              📥 Télécharger SVG
            </button>
          </div>
        </div>

        {/* Sizes Preview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1.5rem',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <h2 style={{ 
            color: '#f8fafc', 
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '1.5rem'
          }}>
            📏 Aperçu des Tailles
          </h2>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1.5rem',
            justifyItems: 'center'
          }}>
            {[
              { size: 32, label: '32px' },
              { size: 48, label: '48px' },
              { size: 64, label: '64px' },
              { size: 128, label: '128px' },
              { size: 180, label: '180px (iOS)' }
            ].map(({ size, label }) => (
              <div key={size} style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: size > 100 ? '200px' : '80px'
                }}>
                  <Image 
                    src="/icon-rounded.svg" 
                    alt={label}
                    width={size}
                    height={size}
                    style={{ width: `${size}px`, height: `${size}px` }}
                  />
                </div>
                <div style={{ 
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '1.5rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            color: '#10b981', 
            marginBottom: '1rem',
            fontSize: '1.25rem'
          }}>
            ✅ Configuration Terminée
          </h3>
          <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
            Les icônes sont maintenant configurées dans <code style={{ 
              background: 'rgba(0,0,0,0.3)',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              color: '#10b981'
            }}>app/layout.tsx</code> et <code style={{ 
              background: 'rgba(0,0,0,0.3)',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              color: '#10b981'
            }}>manifest.json</code>
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            📱 Pour ajouter sur iPhone : Safari &gt; Partager &gt; Sur l&apos;écran d&apos;accueil
          </p>
        </div>

        {/* Success Message */}
        {copied && (
          <div style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
            fontWeight: '600',
            animation: 'slideIn 0.3s ease-out'
          }}>
            ✅ SVG téléchargé !
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

