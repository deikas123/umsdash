import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRef } from 'react';

type LeaveFormPDFProps = {
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  resumeDate: string;
  days: number;
  contactPhone: string;
  contactEmail: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  relieverName: string;
  applicationDate: string;
  status: string;
  hodApproval?: { approved: boolean; date: string } | null;
  hrApproval?: { approved: boolean; date: string } | null;
  gmApproval?: { approved: boolean; date: string } | null;
  leaveBalance?: number;
  balanceAfter?: number;
};

export default function LeaveFormPDF(props: LeaveFormPDFProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = ref.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Leave Application - ${props.employeeName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #000; font-size: 11px; }
        .form-border { border: 2px solid #000; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .header-left h2 { font-size: 14px; font-weight: 700; }
        .header-right { text-align: right; font-size: 9px; line-height: 1.6; }
        .title { text-align: center; font-size: 14px; font-weight: 700; margin: 12px 0; text-decoration: underline; }
        .field-row { display: flex; gap: 20px; margin-bottom: 8px; }
        .field { flex: 1; }
        .field label { font-weight: 700; font-size: 10px; display: block; margin-bottom: 2px; }
        .field .value { border-bottom: 1px solid #000; min-height: 18px; padding: 2px 4px; font-size: 11px; }
        .section-title { font-weight: 700; font-size: 11px; margin: 14px 0 6px; padding: 3px 6px; background: #e0e0e0; }
        .leave-types { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin: 6px 0; }
        .leave-type { display: flex; align-items: center; gap: 6px; font-size: 10px; }
        .circle { width: 12px; height: 12px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; }
        .circle.checked { background: #000; color: #fff; }
        .approval-row { display: flex; gap: 10px; margin-bottom: 8px; padding: 6px; border: 1px solid #ccc; }
        .approval-row .role { font-weight: 700; width: 120px; font-size: 10px; }
        .approval-status { font-size: 10px; }
        .nb { margin-top: 12px; font-size: 9px; }
        .nb li { margin-left: 16px; margin-bottom: 2px; }
        .footer-text { text-align: center; margin-top: 12px; font-size: 8px; color: #666; font-style: italic; }
        @media print { body { padding: 15px; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const leaveTypes = [
    { key: 'annual', label: '1. Annual Leave' },
    { key: 'compassionate', label: '2. Compassionate Leave' },
    { key: 'sick', label: '3. Short-term Sick Leave' },
    { key: 'maternity', label: '4. Maternity Leave' },
    { key: 'paternity', label: '5. Paternity Leave' },
    { key: 'study', label: '6. Study Leave' },
  ];

  const resumeDate = props.resumeDate || (() => {
    const d = new Date(props.endDate);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
        <Download className="h-3 w-3" /> Download Form
      </Button>

      <div ref={ref} style={{ display: 'none' }}>
        <div className="form-border">
          <div className="header">
            <div className="header-left">
              <h2>UTILITY METERING SOLUTIONS LTD</h2>
            </div>
            <div className="header-right">
              <div>REF: PGTL–FT-HR-20</div>
              <div>Version / Revision: 1/00</div>
              <div>Page 1 of 1</div>
            </div>
          </div>

          <div className="title">LEAVE APPLICATION FORM</div>

          <div className="field-row">
            <div className="field"><label>NAME:</label><div className="value">{props.employeeName}</div></div>
            <div className="field"><label>DEPARTMENT:</label><div className="value">{props.department}</div></div>
          </div>

          <div className="field-row">
            <div className="field"><label>No of Leave Days Applied:</label><div className="value">{props.days}</div></div>
          </div>

          <div className="field-row">
            <div className="field"><label>Start Date:</label><div className="value">{props.startDate}</div></div>
            <div className="field"><label>End Date:</label><div className="value">{props.endDate}</div></div>
            <div className="field"><label>Resume Duty on:</label><div className="value">{resumeDate}</div></div>
          </div>

          <div className="section-title">TYPE OF LEAVE APPLIED FOR:</div>
          <div className="leave-types">
            {leaveTypes.map(lt => (
              <div className="leave-type" key={lt.key}>
                <div className={`circle ${props.leaveType === lt.key ? 'checked' : ''}`}>
                  {props.leaveType === lt.key ? '✓' : ''}
                </div>
                <span>{lt.label}</span>
              </div>
            ))}
          </div>

          <div className="section-title">CONTACT DETAILS WHILE ON LEAVE:</div>
          <div className="field-row">
            <div className="field"><label>Phone Number:</label><div className="value">{props.contactPhone}</div></div>
            <div className="field"><label>Email Address:</label><div className="value">{props.contactEmail}</div></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Next of Kin:</label><div className="value">{props.nextOfKin}</div></div>
            <div className="field"><label>Phone Number of Next of Kin:</label><div className="value">{props.nextOfKinPhone}</div></div>
          </div>

          <div className="field-row">
            <div className="field"><label>DATE OF APPLICATION:</label><div className="value">{props.applicationDate}</div></div>
          </div>

          <div className="field-row">
            <div className="field"><label>NAME OF RELIEVER(S):</label><div className="value">{props.relieverName}</div></div>
          </div>

          <div className="section-title">APPROVALS</div>
          <div className="approval-row">
            <div className="role">HEAD OF DEPARTMENT</div>
            <div className="approval-status">
              {props.hodApproval
                ? `${props.hodApproval.approved ? '✅ APPROVED' : '❌ REJECTED'} — ${props.hodApproval.date}`
                : 'PENDING'}
            </div>
          </div>

          <div className="section-title">FOR THE HUMAN RESOURCES DEPARTMENT ONLY</div>
          <div className="field-row">
            <div className="field"><label>Type of Leave:</label><div className="value">{props.leaveType}</div></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Current Leave Balance:</label><div className="value">{props.leaveBalance ?? '—'}</div></div>
            <div className="field"><label>Balance Days after applied leave:</label><div className="value">{props.balanceAfter ?? '—'}</div></div>
          </div>
          <div className="approval-row">
            <div className="role">HR APPROVAL</div>
            <div className="approval-status">
              {props.hrApproval
                ? `${props.hrApproval.approved ? '✅ APPROVED' : '❌ REJECTED'} — ${props.hrApproval.date}`
                : 'PENDING'}
            </div>
          </div>
          <div className="approval-row">
            <div className="role">GM APPROVAL</div>
            <div className="approval-status">
              {props.gmApproval
                ? `${props.gmApproval.approved ? '✅ APPROVED' : '❌ REJECTED'} — ${props.gmApproval.date}`
                : 'PENDING'}
            </div>
          </div>

          <div className="nb">
            <strong>NB:</strong>
            <ol>
              <li>Applicant should ensure leave is approved on all levels before proceeding.</li>
              <li>Leave application must be verified by HR.</li>
              <li>For sick leave to be approved a doctor's note in the sick sheet must be attached.</li>
              <li>If the leave days applied are more than 2 days, a filled Handover form MUST be attached during application.</li>
            </ol>
          </div>

          <div className="footer-text">
            This document contains information pertinent to Utility Metering Solutions. Unauthorized disclosure is strictly prohibited.<br/>
            CONTROLLED COPY
          </div>
        </div>
      </div>
    </>
  );
}
