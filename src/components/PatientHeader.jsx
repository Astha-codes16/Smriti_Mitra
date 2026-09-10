import { patient } from '../data/demoData';

export default function PatientHeader() {
  return (
    <div className="patient-heading">
      <div>
        <span className="eyebrow">Good morning</span>
        <h1>{patient.shortName} <span className="wave">👋</span></h1>
        <p>Age {patient.age} · {patient.location}</p>
      </div>
      <div className="today-badge">
        <span className="today-dot" />
        <span>Today feels like a good day</span>
      </div>
    </div>
  );
}