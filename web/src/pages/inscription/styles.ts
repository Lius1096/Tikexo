export const INSCRIPTION_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
  .pg{font-family:'Inter',sans-serif;color:#1E293B;}

  .two{display:grid;grid-template-columns:1fr 1fr;gap:0;}
  .dark-panel{background:#1A3C5E;padding:36px 28px;display:flex;flex-direction:column;justify-content:space-between;border-radius:14px 0 0 14px;}
  .light-panel{background:#fff;border:0.5px solid #E2E8F0;padding:28px 24px;border-radius:0 14px 14px 0;}
  .full-card{background:#fff;border:0.5px solid #E2E8F0;border-radius:14px;overflow:hidden;}

  .mnav{background:#1A3C5E;display:flex;align-items:center;justify-content:space-between;padding:0 22px;height:48px;border-radius:10px 10px 0 0;}
  .mnav-logo{font-size:15px;font-weight:500;color:#fff;letter-spacing:2px;}
  .mnav-back{display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,0.45);cursor:pointer;}

  .dp-eye{font-size:9px;color:#0EA5E9;letter-spacing:3px;font-weight:500;margin-bottom:10px;}
  .dp-title{font-size:20px;font-weight:300;color:#fff;line-height:1.3;margin-bottom:8px;}
  .dp-title strong{font-weight:500;}
  .dp-sub{font-size:12px;color:rgba(255,255,255,0.4);line-height:1.7;margin-bottom:20px;}

  .dp-steps{display:flex;flex-direction:column;gap:10px;}
  .dp-step{display:flex;align-items:flex-start;gap:10px;}
  .dp-step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0;margin-top:1px;}
  .dp-step-title{font-size:12px;font-weight:500;margin-bottom:2px;}
  .dp-step-sub{font-size:10px;color:rgba(255,255,255,0.35);line-height:1.4;}

  .dp-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px;}
  .dp-badge{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);border-radius:14px;padding:5px 10px;}
  .dp-badge i{font-size:13px;color:#0EA5E9;}
  .dp-badge-txt{font-size:10px;color:rgba(255,255,255,0.6);}

  .steps-bar{display:flex;align-items:center;margin-bottom:22px;}
  .step-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
  .step-circle{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;}
  .step-circle.done{background:#0EA5E9;color:#fff;}
  .step-circle.active{background:#1A3C5E;color:#fff;}
  .step-circle.todo{background:#F1F5F9;color:#94A3B8;border:0.5px solid #E2E8F0;}
  .step-lbl{font-size:9px;color:#94A3B8;text-align:center;}
  .step-lbl.active{color:#1A3C5E;font-weight:500;}
  .step-connector{flex:1;height:0.5px;background:#E2E8F0;margin-top:-16px;}
  .step-connector.done{background:#0EA5E9;}

  .section-label{font-size:10px;font-weight:500;color:#0EA5E9;letter-spacing:1.5px;margin:16px 0 10px;display:flex;align-items:center;gap:7px;}
  .section-label::after{content:'';flex:1;height:0.5px;background:#E2E8F0;}

  .form-group{margin-bottom:12px;}
  .form-label{font-size:11px;font-weight:500;color:#475569;margin-bottom:4px;display:flex;align-items:center;gap:4px;}
  .form-required{color:#991B1B;}
  .form-optional{font-size:10px;color:#94A3B8;font-weight:400;}
  .form-input{width:100%;background:#F8FAFC;border:0.5px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:13px;color:#1E293B;font-family:'Inter',sans-serif;outline:none;}
  .form-input:focus{border-color:#0EA5E9;background:#fff;}
  .form-input.error{border-color:#991B1B;background:#FFF5F5;}
  .form-select{width:100%;background:#F8FAFC;border:0.5px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:13px;color:#1E293B;font-family:'Inter',sans-serif;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
  .form-select:focus{border-color:#0EA5E9;background-color:#fff;}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .form-hint{font-size:10px;color:#94A3B8;margin-top:3px;display:flex;align-items:center;gap:4px;}
  .form-error{font-size:10px;color:#991B1B;margin-top:3px;display:flex;align-items:center;gap:4px;}
  .form-success{font-size:10px;color:#3B6D11;margin-top:3px;display:flex;align-items:center;gap:4px;}

  .kyb-notice{background:#DBEAFE;border:0.5px solid #B5D4F4;border-radius:8px;padding:10px 12px;margin-bottom:14px;display:flex;align-items:flex-start;gap:8px;}
  .kyb-notice i{font-size:15px;color:#185FA5;flex-shrink:0;margin-top:1px;}
  .kyb-notice-text{font-size:11px;color:#0C447C;line-height:1.5;}

  .auto-fields{background:#F8FAFC;border:0.5px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:14px;}
  .auto-fields-title{font-size:10px;color:#94A3B8;letter-spacing:1px;margin-bottom:8px;}
  .auto-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:0.5px solid #F1F5F9;}
  .auto-row:last-child{border-bottom:none;}
  .auto-label{font-size:11px;color:#64748B;}
  .auto-badge{font-size:9px;padding:2px 7px;border-radius:7px;}
  .auto-badge.auto{background:#DBEAFE;color:#185FA5;}
  .auto-badge.admin{background:#FAEEDA;color:#854F0B;}

  .btn-primary{width:100%;background:#1A3C5E;color:#fff;font-size:13px;font-weight:500;padding:12px;border-radius:10px;border:none;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
  .btn-accent{width:100%;background:#0EA5E9;color:#fff;font-size:13px;font-weight:500;padding:12px;border-radius:10px;border:none;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;}
  .btn-accent:disabled{opacity:0.5;cursor:not-allowed;}
  .btn-ghost{width:100%;background:transparent;color:#64748B;font-size:12px;padding:10px;border-radius:10px;border:0.5px solid #CBD5E1;cursor:pointer;font-family:'Inter',sans-serif;}

  .checkbox-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;}
  .cb{width:16px;height:16px;border-radius:4px;border:0.5px solid #CBD5E1;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;cursor:pointer;}
  .cb.checked{background:#1A3C5E;border-color:#1A3C5E;}
  .cb i{font-size:11px;color:#fff;}
  .cb-text{font-size:11px;color:#475569;line-height:1.5;}
  .cb-text a{color:#0EA5E9;cursor:pointer;}

  .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
  .plan-card{border:0.5px solid #E2E8F0;border-radius:10px;padding:12px 10px;cursor:pointer;text-align:center;}
  .plan-card.selected{border-color:#1A3C5E;border-width:1.5px;background:#F8FAFC;}
  .plan-card.popular{border-color:#0EA5E9;}
  .plan-name{font-size:11px;font-weight:500;color:#1E293B;margin-bottom:3px;}
  .plan-price{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;color:#1A3C5E;}
  .plan-period{font-size:9px;color:#94A3B8;margin-top:1px;}
  .plan-pop-badge{font-size:8px;background:#0EA5E9;color:#fff;padding:1px 6px;border-radius:6px;display:inline-block;margin-bottom:4px;}
  .plan-commission{font-size:9px;color:#64748B;margin-top:4px;}

  .recap-card{background:#1A3C5E;border-radius:10px;padding:16px;margin-bottom:12px;}
  .rc-title{font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-bottom:10px;}
  .rc-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);}
  .rc-row:last-child{border-bottom:none;}
  .rc-label{font-size:11px;color:rgba(255,255,255,0.4);}
  .rc-val{font-size:11px;font-weight:500;color:#fff;}
  .rc-val.accent{color:#0EA5E9;}
  .rc-val.mono{font-family:'JetBrains Mono',monospace;}

  .op-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
  .op-card{border:0.5px solid #E2E8F0;border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;}
  .op-card.selected{border-color:#1A3C5E;border-width:1.5px;background:#F8FAFC;}
  .op-dot{width:22px;height:22px;border-radius:50%;margin:0 auto 5px;}
  .op-name{font-size:10px;font-weight:500;color:#1E293B;}
  .op-num{font-size:9px;color:#94A3B8;margin-top:1px;}

  .success-screen{text-align:center;padding:30px 24px;}
  .success-icon{width:52px;height:52px;background:#EAF3DE;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}
  .success-icon i{font-size:24px;color:#3B6D11;}
  .si-card{background:#F8FAFC;border:0.5px solid #E2E8F0;border-radius:10px;padding:12px 14px;text-align:left;margin:14px 0;}
  .si-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid #F1F5F9;}
  .si-row:last-child{border-bottom:none;}
  .si-label{font-size:11px;color:#94A3B8;}
  .si-val{font-size:11px;font-weight:500;color:#1E293B;}
  .si-val.mono{font-family:'JetBrains Mono',monospace;color:#1A3C5E;}
  .si-val.green{color:#3B6D11;}

  .otp-wrap{display:flex;gap:8px;justify-content:center;margin:20px 0;}
  .otp-digit{width:44px;height:52px;border:0.5px solid #E2E8F0;border-radius:10px;font-size:22px;font-weight:500;text-align:center;font-family:'JetBrains Mono',monospace;color:#1A3C5E;background:#F8FAFC;outline:none;}
  .otp-digit:focus{border-color:#0EA5E9;background:#fff;}

  .alert-error{background:#FFF5F5;border:0.5px solid #FCA5A5;border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:flex-start;gap:8px;font-size:11px;color:#991B1B;line-height:1.5;}
`;
