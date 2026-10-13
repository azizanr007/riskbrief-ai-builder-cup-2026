from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'RiskBrief-AI-Builder-Cup-2026-Proposal.pdf'
INK = colors.HexColor('#17231d')
GREEN = colors.HexColor('#2d683f')
MUTED = colors.HexColor('#526259')
PALE = colors.HexColor('#edf4ee')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=28, leading=33, textColor=INK, alignment=TA_LEFT, spaceAfter=10))
styles.add(ParagraphStyle(name='Deck', parent=styles['Normal'], fontName='Helvetica', fontSize=13, leading=19, textColor=MUTED, spaceAfter=11))
styles.add(ParagraphStyle(name='Section', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=GREEN, spaceBefore=11, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.4, leading=14, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name='SmallCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.1, leading=11, textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle(name='Tag', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=GREEN, spaceAfter=7))


def p(text, style='BodyCustom'):
    return Paragraph(text, styles[style])


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor('#dbe5dc'))
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10.5 * mm, 'RISKBRIEF · AI BUILDER CUP 2026 · SYNTHETIC-ONLY DEMONSTRATION')
    canvas.drawRightString(width - 18 * mm, 10.5 * mm, str(doc.page))
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUT), pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
    topMargin=19 * mm, bottomMargin=22 * mm,
    title='RiskBrief — Evidence-Led BFSI Risk Intelligence', author='RiskBrief project team',
)
story = [Spacer(1, 17 * mm), p('AI BUILDER CUP 2026  /  BFSI', 'Tag'), p('RiskBrief', 'CoverTitle'), p('Evidence-led risk intelligence with constrained AI and human review', 'Deck')]
story.append(Spacer(1, 6 * mm))
banner = Table([[p('<b>Prototype boundary</b><br/>Synthetic aggregate inputs only. The system is a triage demonstration, not a credit decision, fraud adjudication, investment recommendation, or financial transaction system.', 'BodyCustom')]], colWidths=[170 * mm])
banner.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), PALE), ('BOX', (0, 0), (-1, -1), 0.7, GREEN),
    ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story += [banner, Spacer(1, 8 * mm), p('The challenge', 'Section')]
story.append(p('BFSI teams need a consistent way to review changes across aggregate risk indicators without losing sight of source evidence. Summaries can be hard to audit when signals, model language, and human decisions are blended together. A responsible workflow should show the evidence behind a flag, surface uncertainty, and keep final judgment with an authorized reviewer.'))
story += [p('The solution', 'Section')]
story.append(p('RiskBrief turns a small, strictly synthetic portfolio snapshot into deterministic evidence. Gemini can select only findings already produced by that evidence. The application validates every selected evidence ID and finding code, then renders language from fixed statements. A reviewer separately approves or rejects the saved brief. Model output never triggers an action.'))
story += [p('Intended users', 'Section')]
story.append(p('Analysts and reviewers in a banking, financial-services, or insurance operations context. The demonstration supports a synthetic workflow only; it does not process real customers or make adjudications.'))

story.append(PageBreak())
story += [p('How the workflow works', 'Section')]
steps = [
    ('1 · Submit', 'An authenticated analyst loads a bounded JSON dataset labeled SYNTHETIC_TEST_DATA. Only enumerated portfolio segment labels and bounded numeric fields are accepted.'),
    ('2 · Compute', 'Deterministic code calculates exposure concentration, delinquency level/change, and alert-volume flags. A content hash and evidence IDs make the calculation repeatable.'),
    ('3 · Select', 'Firebase AI Logic sends only compact evidence IDs, fixed segment names, and supported flag codes to a Gemini Developer API model. JSON output is constrained by an SDK schema.'),
    ('4 · Validate', 'The client rejects extra fields, unsupported codes, duplicate selections, unknown evidence IDs, or findings absent from deterministic evidence. Fixed copy renders the validated selection.'),
    ('5 · Review', 'The analyst saves a brief in Firestore. A separately provisioned reviewer may make one pending-to-approved or rejected transition. Review is not performed by AI.'),
]
for heading, body in steps:
    story.append(KeepTogether([p(heading, 'Section'), p(body)]))
story += [p('AI design and safety', 'Section')]
story.append(p('The model is used as a constrained evidence selector rather than a source of facts. It receives no tools, no free-text user prompt, no raw uploaded files, and no real financial or customer data. A model response is not described as successful until parsing and evidence validation pass. The user interface keeps deterministic evidence, model selection, uncertainty, and human decision visibly separate.'))
story += [p('Technical architecture', 'Section')]
architecture = [
    [p('<b>Layer</b>', 'SmallCustom'), p('<b>Prototype choice</b>', 'SmallCustom')],
    [p('Hosting', 'SmallCustom'), p('Firebase Hosting static assets on Spark, subject to current project quota.', 'SmallCustom')],
    [p('Identity', 'SmallCustom'), p('Firebase Authentication sign-in only; owner-provisioned accounts, no client signup.', 'SmallCustom')],
    [p('AI', 'SmallCustom'), p('Firebase AI Logic Web SDK, Gemini Developer API free-tier model, App Check enforcement required.', 'SmallCustom')],
    [p('Persistence', 'SmallCustom'), p('Firestore document ownership and reviewer membership rules, synthetic-only records.', 'SmallCustom')],
    [p('Analysis', 'SmallCustom'), p('Client-side fixed deterministic thresholds; constrained model output validated against computed evidence.', 'SmallCustom')],
]
table = Table(architecture, colWidths=[35 * mm, 135 * mm], repeatRows=1)
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), PALE), ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#cbd8ce')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7),
    ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(table)

story.append(PageBreak())
story += [p('Impact hypothesis and measurement', 'Section')]
story.append(p('The hypothesis is that visible source evidence and explicit uncertainty can make aggregate triage easier to inspect. This prototype has not established accuracy, time saved, fraud reduction, fairness, or financial benefit. A future evaluation could measure evidence traceability, unsupported-output rejection, reviewer disagreement, review time, and usability using synthetic or appropriately governed data.'))
story += [p('Feasibility and scale', 'Section')]
story.append(p('The demonstration intentionally bounds input to a few aggregate segments and a single constrained model request. Firebase Hosting and Firestore offer no-cost Spark quotas, but quotas are finite and exceeding them can disable service until the quota resets. The Gemini Developer API has a limited free tier whose project eligibility, model availability, rate limits, and current quota must be confirmed in Firebase or AI Studio. Free access is not unlimited and can change. No Cloud Billing account or paid model tier should be linked for this demonstration.'))
story += [p('Security and operational limits', 'Section')]
for line in [
    'Firebase App Check must be enforced for Firebase AI Logic before enabling a deployed model call; the live deployment requires the production reCAPTCHA Enterprise provider.',
    'Firebase client configuration and reCAPTCHA site key are public identifiers; application-restricted keys and actual Hosting origins must be configured.',
    'The static client has no trusted backend. Browser-side validation can be bypassed. Firestore Rules enforce user ownership and reviewer transition rules but cannot independently recompute analysis or validate a Gemini response.',
    'Client audit documents are append-only under deployed Firestore rules, but are not a cryptographic hash chain and are not immutable against privileged administrators.',
    'No real customer, account, employee, applicant, fraud-case, or live portfolio data is permitted.',
]:
    story.append(p('• ' + line))
story += [p('Current verified status — October 13, 2026', 'Section')]
story.append(p('The original Python v0.4 archive is unchanged; 77 passing Python tests were recorded on October 10. The separate JavaScript demonstration now passes 10 domain/control tests, six real-Chromium UI tests with explicitly mocked services, seven actual Firestore Emulator rules tests, a static build, and local desktop/mobile HTTP/browser checks. The public repository is github.com/azizanr007/riskbrief-ai-builder-cup-2026. Firebase authentication and cloud access remain unavailable; the target Hosting endpoint returned HTTP 404. Spark status, actual quota, a real Gemini invocation, deployment, video and submission have not been verified. The PDF records implementation evidence, not cloud success.'))
story += [p('Competition category', 'Section'), p('AI Builder Cup 2026 — BFSI: Intelligent Risk, Fraud & Financial Experiences.'), p('Official dates', 'Section')]
story.append(p('The official site checked October 13 states registration closed October 11, team formation runs through October 14, and prototype submission runs through October 18, 2026. Published criteria specify working professionals, no students, age 21+, JAPAC and teams of 2–4. The registered team, member eligibility and prescribed dashboard template remain unverified.'))
story.append(Spacer(1, 2 * mm))
story.append(p('References: Firebase AI Logic model support and pricing; Firebase Spark plan and Hosting quotas; Firebase AI Logic App Check; official AI Builder Cup BFSI theme, timeline, eligibility, and submission requirements. Sources: firebase.google.com/docs/ai-logic · firebase.google.com/docs/projects/billing/firebase-pricing-plans · aibuildercup.com/themes.html · aibuildercup.com/', 'SmallCustom'))
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
