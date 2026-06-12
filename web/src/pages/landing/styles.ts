// CSS partagé pour toute la landing page (injecté une seule fois via LandingNav ou Landing)
export const LANDING_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  .lp{font-family:'Inter',sans-serif;background:#F1F5F9;color:#1E293B;}

  /* NAV */
  .nav{background:#1A3C5E;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:52px;}
  .nav-brand{display:flex;align-items:center;gap:10px;}
  .nav-logo{font-family:'Inter',sans-serif;font-size:18px;font-weight:500;color:#fff;letter-spacing:2px;}
  .nav-badge{font-size:9px;background:#0EA5E9;color:#fff;padding:2px 7px;border-radius:10px;letter-spacing:1px;font-weight:500;}
  .nav-links{display:flex;gap:20px;}
  .nav-link{font-size:12px;color:rgba(255,255,255,0.55);cursor:pointer;letter-spacing:0.3px;}
  .nav-cta{background:#0EA5E9;color:#fff;font-size:12px;font-weight:500;padding:8px 18px;border-radius:20px;cursor:pointer;border:none;font-family:'Inter',sans-serif;}

  /* HERO */
  .hero{background:#1A3C5E;}
  .hero-inner{display:grid;grid-template-columns:1fr 1fr;min-height:380px;}
  .hero-left{padding:48px 32px 48px 28px;display:flex;flex-direction:column;justify-content:center;}
  .hero-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:500;margin-bottom:14px;}
  .hero-title{font-size:36px;font-weight:300;color:#fff;line-height:1.15;margin-bottom:10px;}
  .hero-title strong{font-weight:500;color:#0EA5E9;}
  .hero-sub{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:28px;max-width:300px;}
  .hero-ctas{display:flex;gap:10px;align-items:center;}
  .hero-btn-p{background:#0EA5E9;color:#fff;font-size:12px;font-weight:500;padding:11px 22px;border-radius:22px;cursor:pointer;border:none;font-family:'Inter',sans-serif;}
  .hero-btn-s{background:transparent;color:rgba(255,255,255,0.55);font-size:12px;padding:11px 18px;border-radius:22px;cursor:pointer;border:0.5px solid rgba(255,255,255,0.15);font-family:'Inter',sans-serif;display:flex;align-items:center;gap:6px;}

  .hero-right{background:#0f2a42;display:flex;flex-direction:column;padding:24px;}
  .hero-wallet{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;margin-bottom:14px;}
  .hw-label{font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-bottom:6px;}
  .hw-amount{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:#fff;line-height:1;}
  .hw-currency{font-size:13px;color:rgba(255,255,255,0.4);margin-left:6px;}
  .hw-source{font-size:10px;color:rgba(255,255,255,0.3);margin-top:5px;display:flex;align-items:center;gap:5px;}
  .hw-source-dot{width:6px;height:6px;border-radius:50%;background:#0EA5E9;}
  .hw-bar{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;margin-top:12px;overflow:hidden;}
  .hw-bar-fill{height:100%;background:#0EA5E9;border-radius:2px;width:68%;}

  .flow-strip{display:flex;align-items:center;gap:0;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;margin-bottom:10px;}
  .flow-node{flex:1;text-align:center;}
  .flow-node-val{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;color:#fff;}
  .flow-node-val.accent{color:#0EA5E9;}
  .flow-node-label{font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-top:3px;}
  .flow-arrow{padding:0 6px;display:flex;flex-direction:column;align-items:center;gap:3px;}
  .flow-arrow-line{width:28px;height:1px;background:rgba(255,255,255,0.1);}
  .flow-arrow-free{font-size:9px;color:#0EA5E9;font-weight:500;}

  .hero-txs{display:flex;flex-direction:column;gap:6px;}
  .hero-tx{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.06);border-radius:8px;}
  .hero-tx-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .hero-tx-name{font-size:11px;font-weight:500;color:rgba(255,255,255,0.75);flex:1;}
  .hero-tx-sub{font-size:9px;color:rgba(255,255,255,0.25);}
  .hero-tx-amt{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;flex-shrink:0;}
  .hero-tx-amt.credit{color:#0EA5E9;}
  .hero-tx-amt.debit{color:rgba(255,255,255,0.4);}

  .hero-stats{background:#0a1f30;display:flex;border-top:0.5px solid rgba(255,255,255,0.05);}
  .hero-stat{flex:1;padding:12px 14px;text-align:center;border-right:0.5px solid rgba(255,255,255,0.05);}
  .hero-stat:last-child{border-right:none;}
  .hero-stat-val{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:500;color:#0EA5E9;}
  .hero-stat-label{font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-top:2px;}

  /* COMMON SECTION */
  .section{padding:48px 28px;}
  .section-header{margin-bottom:32px;}
  .section-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:500;margin-bottom:6px;}
  .section-title{font-size:26px;font-weight:300;color:#1E293B;line-height:1.3;}
  .section-title strong{font-weight:500;color:#1A3C5E;}
  .section-sub{font-size:13px;color:#64748B;line-height:1.7;margin-top:6px;max-width:480px;}

  /* HOW IT WORKS */
  .how-works{background:#1A3C5E;padding:48px 28px;}
  .how-title{font-size:26px;font-weight:300;color:#fff;margin-bottom:6px;}
  .how-title strong{font-weight:500;color:#0EA5E9;}
  .how-sub{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:32px;}
  .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .how-card{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 16px;}
  .how-num{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:rgba(14,165,233,0.3);margin-bottom:10px;line-height:1;}
  .how-card-title{font-size:13px;font-weight:500;color:#fff;margin-bottom:6px;}
  .how-card-desc{font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;}
  .how-highlight{background:#0EA5E9;border-color:#0EA5E9;}
  .how-highlight .how-num{color:rgba(255,255,255,0.4);}
  .how-highlight .how-card-desc{color:rgba(255,255,255,0.75);}
  .how-tag{font-size:9px;background:rgba(255,255,255,0.2);color:#fff;padding:2px 7px;border-radius:8px;display:inline-block;margin-top:8px;}

  /* ACTORS */
  .actors-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .actor-card{background:#fff;border:0.5px solid #E2E8F0;border-radius:14px;overflow:hidden;}
  .actor-header{padding:14px 16px;display:flex;align-items:center;gap:10px;}
  .actor-avatar{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .actor-name{font-size:13px;font-weight:500;color:#1E293B;}
  .actor-role{font-size:10px;color:#94A3B8;margin-top:1px;}
  .actor-features{padding:0 16px 14px;}
  .actor-feat{display:flex;align-items:flex-start;gap:7px;padding:5px 0;border-top:0.5px solid #F1F5F9;}
  .actor-feat-text{font-size:11px;color:#475569;line-height:1.4;}

  /* WALLET SECTION */
  .wallet-section{background:#F8FAFC;border-top:0.5px solid #E2E8F0;border-bottom:0.5px solid #E2E8F0;padding:48px 28px;}
  .wallet-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
  .wallet-right{background:#1A3C5E;border-radius:16px;padding:22px;overflow:hidden;}
  .wallet-example-title{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-bottom:14px;}
  .wallet-ex-row{display:flex;align-items:center;padding:8px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);}
  .wallet-ex-row:last-child{border-bottom:none;}
  .wallet-ex-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px;}
  .wallet-ex-label{font-size:11px;color:rgba(255,255,255,0.55);flex:1;}
  .wallet-ex-tag{font-size:9px;padding:2px 7px;border-radius:7px;flex-shrink:0;}
  .wallet-ex-tag.free{background:rgba(14,165,233,0.2);color:#0EA5E9;}
  .wallet-ex-tag.paid{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);}

  /* PRICING */
  .pricing-section{padding:48px 28px;}
  .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .pricing-card{background:#fff;border:0.5px solid #E2E8F0;border-radius:14px;padding:20px 18px;}
  .pricing-card.featured{background:#1A3C5E;border-color:#1A3C5E;}
  .pricing-name{font-size:12px;font-weight:500;letter-spacing:0.5px;margin-bottom:8px;}
  .pricing-card:not(.featured) .pricing-name{color:#64748B;}
  .pricing-card.featured .pricing-name{color:rgba(255,255,255,0.5);}
  .pricing-price{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:500;line-height:1;margin-bottom:4px;}
  .pricing-card:not(.featured) .pricing-price{color:#1E293B;}
  .pricing-card.featured .pricing-price{color:#0EA5E9;}
  .pricing-period{font-size:10px;color:#94A3B8;margin-bottom:16px;}
  .pricing-card.featured .pricing-period{color:rgba(255,255,255,0.3);}
  .pricing-feat{display:flex;align-items:flex-start;gap:7px;margin-bottom:7px;}
  .pricing-feat-text{font-size:11px;line-height:1.4;}
  .pricing-card:not(.featured) .pricing-feat-text{color:#475569;}
  .pricing-card.featured .pricing-feat-text{color:rgba(255,255,255,0.65);}
  .pricing-cta{width:100%;padding:10px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;margin-top:14px;font-family:'Inter',sans-serif;border:none;}
  .pricing-card:not(.featured) .pricing-cta{background:#F1F5F9;color:#1A3C5E;}
  .pricing-card.featured .pricing-cta{background:#0EA5E9;color:#fff;}
  .pricing-badge{font-size:9px;background:#0EA5E9;color:#fff;padding:2px 8px;border-radius:8px;display:inline-block;margin-bottom:10px;}

  /* BENIN */
  .benin-section{background:#1A3C5E;padding:48px 28px;}
  .benin-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;}
  .benin-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:500;margin-bottom:10px;}
  .benin-title{font-size:26px;font-weight:300;color:#fff;line-height:1.3;margin-bottom:12px;}
  .benin-title strong{font-weight:500;}
  .benin-sub{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:20px;}
  .benin-ops{display:flex;gap:8px;flex-wrap:wrap;}
  .benin-op{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);border-radius:20px;padding:6px 12px;}
  .benin-op-dot{width:7px;height:7px;border-radius:50%;background:#0EA5E9;}
  .benin-op-name{font-size:11px;color:rgba(255,255,255,0.75);font-weight:500;}
  .benin-stat-card{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;}
  .benin-stat-icon{width:36px;height:36px;background:rgba(14,165,233,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .benin-stat-val{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:500;color:#fff;}
  .benin-stat-label{font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px;}
  .benin-right{display:flex;flex-direction:column;gap:8px;}

  /* CTA */
  .cta-section{padding:56px 28px;text-align:center;background:#fff;border-top:0.5px solid #E2E8F0;}
  .cta-eyebrow{font-size:10px;color:#0EA5E9;letter-spacing:3px;font-weight:500;margin-bottom:10px;}
  .cta-title{font-size:28px;font-weight:300;color:#1E293B;margin-bottom:8px;}
  .cta-title strong{font-weight:500;color:#1A3C5E;}
  .cta-sub{font-size:13px;color:#64748B;margin-bottom:28px;line-height:1.7;}
  .cta-btns{display:flex;gap:10px;justify-content:center;}
  .cta-btn-main{background:#1A3C5E;color:#fff;font-size:13px;font-weight:500;padding:13px 28px;border-radius:24px;cursor:pointer;border:none;font-family:'Inter',sans-serif;}
  .cta-btn-ghost{background:transparent;color:#64748B;font-size:12px;padding:13px 22px;border-radius:24px;cursor:pointer;border:0.5px solid #CBD5E1;font-family:'Inter',sans-serif;}

  /* FOOTER */
  .footer{background:#0f2a42;padding:22px 28px;display:flex;align-items:center;justify-content:space-between;}
  .footer-logo{font-size:14px;font-weight:500;color:#0EA5E9;letter-spacing:2px;}
  .footer-sub{font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1.5px;margin-top:2px;}
  .footer-links{display:flex;gap:16px;}
  .footer-link{font-size:10px;color:rgba(255,255,255,0.25);cursor:pointer;}
  .footer-copy{font-size:9px;color:rgba(255,255,255,0.2);}
`;
