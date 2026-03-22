import { Link } from 'react-router-dom';

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  primary: '#6B8CAE',
  navy: '#2C3E6B',
  bg: '#F4F6F8',
  white: '#ffffff',
  text: '#1A2535',
  muted: '#5C6F86',
  border: '#DDE3EA',
};

// ── Inline style objects ─────────────────────────────────────────────────────
const styles = {
  hero: {
    background: `linear-gradient(135deg, ${C.navy} 0%, #3D5280 60%, #2C3E6B 100%)`,
    minHeight: '100vh',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  heroGrid: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(107,140,174,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(107,140,174,0.12) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none' as const,
  },
  heroOrb1: {
    position: 'absolute' as const,
    top: '-120px',
    right: '-120px',
    width: '480px',
    height: '480px',
    borderRadius: '50%',
    background: `radial-gradient(circle, rgba(107,140,174,0.18) 0%, transparent 70%)`,
    pointerEvents: 'none' as const,
  },
  heroOrb2: {
    position: 'absolute' as const,
    bottom: '-100px',
    left: '-80px',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: `radial-gradient(circle, rgba(107,140,174,0.12) 0%, transparent 70%)`,
    pointerEvents: 'none' as const,
  },
  nav: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '20px 48px',
    position: 'relative' as const,
    zIndex: 10,
  },
  brand: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
    textDecoration: 'none',
    color: C.white,
  },
  loginBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: `1.5px solid rgba(255,255,255,0.35)`,
    color: C.white,
    background: 'rgba(255,255,255,0.08)',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s',
  },
  heroContent: {
    flex: 1,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    textAlign: 'center' as const,
    padding: '80px 32px 120px',
    position: 'relative' as const,
    zIndex: 10,
  },
  heroTag: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '100px',
    background: 'rgba(107,140,174,0.22)',
    border: `1px solid rgba(107,140,174,0.4)`,
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '28px',
    letterSpacing: '0.5px',
  },
  heroHeadline: {
    fontSize: 'clamp(48px, 7vw, 88px)',
    fontWeight: 800,
    color: C.white,
    lineHeight: 1.05,
    margin: '0 0 20px',
    letterSpacing: '-1.5px',
  },
  heroSub: {
    fontSize: 'clamp(16px, 2.5vw, 22px)',
    color: 'rgba(255,255,255,0.72)',
    maxWidth: '580px',
    lineHeight: 1.55,
    margin: '0 0 44px',
  },
  ctaBtn: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    padding: '16px 36px',
    borderRadius: '10px',
    background: C.primary,
    color: C.white,
    textDecoration: 'none',
    fontSize: '17px',
    fontWeight: 700,
    boxShadow: `0 8px 24px rgba(107,140,174,0.45)`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  section: (bg: string) => ({
    padding: '96px 32px',
    background: bg,
  }),
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: C.primary,
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 800,
    color: C.text,
    lineHeight: 1.15,
    margin: '0 0 16px',
  },
  sectionSub: {
    fontSize: '17px',
    color: C.muted,
    maxWidth: '540px',
    lineHeight: 1.6,
    margin: '0 0 64px',
  },
  grid3: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '28px',
  },
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '36px 32px',
    boxShadow: '0 2px 8px rgba(26,37,53,0.06)',
  },
  iconCircle: (bg: string) => ({
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: bg,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: '20px',
    fontSize: '22px',
  }),
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: C.text,
    margin: '0 0 10px',
  },
  cardBody: {
    fontSize: '15px',
    color: C.muted,
    lineHeight: 1.6,
    margin: 0,
  },
  stepNum: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: C.navy,
    color: C.white,
    fontWeight: 800,
    fontSize: '18px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    marginBottom: '16px',
  },
  riskHigh: {
    background: '#FEF2F2',
    border: '2px solid #FCA5A5',
    borderRadius: '12px',
    padding: '24px 28px',
  },
  riskLow: {
    background: '#F0FDF4',
    border: '2px solid #86EFAC',
    borderRadius: '12px',
    padding: '24px 28px',
  },
  riskBadgeHigh: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '100px',
    background: '#DC2626',
    color: 'white',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginBottom: '10px',
  },
  riskBadgeLow: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '100px',
    background: '#16A34A',
    color: 'white',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginBottom: '10px',
  },
  footer: {
    background: C.navy,
    padding: '48px 32px',
    color: 'rgba(255,255,255,0.6)',
  },
};

// ── Shield icon ──────────────────────────────────────────────────────────────
const ShieldIcon = ({ size = 28, color = C.white }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

// ── Landing Page ─────────────────────────────────────────────────────────────
export const LandingPage = () => {
  return (
    <div style={{ fontFamily: "'Andika', Arial, sans-serif", color: C.text }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={styles.hero}>
        <div style={styles.heroGrid} aria-hidden="true" />
        <div style={styles.heroOrb1} aria-hidden="true" />
        <div style={styles.heroOrb2} aria-hidden="true" />

        {/* Nav */}
        <nav style={styles.nav}>
          <a href="/" style={styles.brand}>
            <ShieldIcon size={32} color={C.white} />
            <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>MediFlow</span>
          </a>
          <Link to="/login" style={styles.loginBtn}>Login</Link>
        </nav>

        {/* Hero content */}
        <div style={styles.heroContent}>
          <div style={styles.heroTag}>
            <ShieldIcon size={13} color="rgba(255,255,255,0.85)" />
            Clinical Decision Support · East Africa
          </div>
          <h1 style={styles.heroHeadline}>
            Predict.<br />Prepare.<br />Protect.
          </h1>
          <p style={styles.heroSub}>
            Real-time Postpartum Hemorrhage risk prediction for healthcare
            professionals in East Africa.
          </p>
          <Link to="/login" style={styles.ctaBtn}>
            Get Access →
          </Link>
        </div>
      </section>
    </div>
  );
};
