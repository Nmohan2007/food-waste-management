import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

const RiskBadge = ({ status, type = 'expiry' }) => {
  if (!status) return null;

  const normalized = status.toLowerCase();

  if (normalized.includes('critical')) {
    return (
      <span className="badge badge-critical">
        <AlertCircle size={13} /> {status}
      </span>
    );
  }
  if (normalized.includes('high')) {
    return (
      <span className="badge badge-high">
        <AlertTriangle size={13} /> {status}
      </span>
    );
  }
  if (normalized.includes('medium')) {
    return (
      <span className="badge badge-medium">
        <Clock size={13} /> {status}
      </span>
    );
  }
  if (normalized.includes('safe') || normalized.includes('low') || normalized.includes('available') || normalized.includes('completed')) {
    return (
      <span className="badge badge-safe">
        <CheckCircle2 size={13} /> {status}
      </span>
    );
  }
  if (normalized.includes('expired') || normalized.includes('cancelled') || normalized.includes('rejected')) {
    return (
      <span className="badge badge-expired">
        <XCircle size={13} /> {status}
      </span>
    );
  }

  return <span className="badge badge-medium">{status}</span>;
};

export default RiskBadge;
