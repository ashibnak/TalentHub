/**
 * Tip-of-the-day pool — idempotent. Run: `npm run db:seed:tips`
 *
 * ~90 tips across four categories. Selection is deterministic on day-of-year
 * (lib/tips/rules.ts), so this pool is roughly three months of content written
 * ONCE: there is no daily authoring burden on the single admin, and everyone
 * sees the same tip today, which makes it a talking point rather than isolated
 * trivia.
 *
 * `audience` keeps one pool serving both personas — a Domain Expert never gets
 * a Cursor keybinding, a Builder never gets "what a prompt is".
 *
 * Re-running updates a tip in place (conflict on `slug`) instead of duplicating,
 * so copy can be corrected without wiping the table.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // .env fallback

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { tips } from '../lib/db/schema';
import type { TipAudience, TipCategory } from '../lib/tips/rules';

const db = getDb();

type SeedTip = { slug: string; category: TipCategory; audience: TipAudience; title: string; body: string };

const t = (
  slug: string,
  category: TipCategory,
  audience: TipAudience,
  title: string,
  body: string,
): SeedTip => ({ slug, category, audience, title, body });

/* ─────────────────── ۱. مهندسی پرامپت (prompt engineering) ───────────── */
const PROMPT_ENGINEERING: SeedTip[] = [
  t('pe-role', 'prompt_engineering', 'all', 'نقش بده، نه فقط سؤال', 'به‌جای «این متن را خلاصه کن» بنویس «تو یک ویراستار فنی هستی؛ این متن را در سه بند برای مدیر غیرفنی خلاصه کن».'),
  t('pe-format', 'prompt_engineering', 'all', 'قالب خروجی را دقیق بگو', 'اگر جدول می‌خواهی، ستون‌ها را نام ببر. مدل قالب را حدس می‌زند و حدسش معمولاً با چیزی که در ذهن توست فرق دارد.'),
  t('pe-example', 'prompt_engineering', 'all', 'یک نمونه بهتر از ده خط توضیح است', 'یک ورودی و خروجی نمونه بگذار. مدل از الگو بهتر یاد می‌گیرد تا از توصیف.'),
  t('pe-negative', 'prompt_engineering', 'all', 'بگو چه چیزی نمی‌خواهی', '«بدون مقدمه، بدون نتیجه‌گیری، بدون emoji» اغلب بیشتر از سه جمله توضیح مثبت کمک می‌کند.'),
  t('pe-context-first', 'prompt_engineering', 'all', 'زمینه اول، دستور آخر', 'اول داده و زمینه را بده، بعد بگو با آن چه کند. مدل‌ها به انتهای پرامپت وزن بیشتری می‌دهند.'),
  t('pe-chunk', 'prompt_engineering', 'all', 'متن بلند را تکه کن', 'یک سند ۵۰ صفحه‌ای را یکجا نده. تکه‌تکه خلاصه کن، بعد خلاصه‌ها را خلاصه کن.'),
  t('pe-ask-questions', 'prompt_engineering', 'all', 'از مدل بخواه اول سؤال بپرسد', '«قبل از شروع، سه سؤالی که برای انجام درست این کار لازم داری بپرس.» جواب‌ها اغلب نشان می‌دهند صورت‌مسئله‌ات ناقص بوده.'),
  t('pe-temperature', 'prompt_engineering', 'builder', 'دما را متناسب کار بگذار', 'برای استخراج داده و JSON، temperature را ۰ بگذار. برای ایده‌پردازی بالاتر. دمای پیش‌فرض برای هیچ‌کدام بهینه نیست.'),
  t('pe-json', 'prompt_engineering', 'builder', 'خروجی JSON را validate کن', 'هیچ‌وقت به معتبر بودن JSON مدل اعتماد نکن. با Zod یا مشابهش parse کن و یک بار retry بگذار.'),
  t('pe-fences', 'prompt_engineering', 'builder', 'حصار markdown را پاک کن', 'مدل‌ها حتی وقتی می‌گویی «فقط JSON» گاهی ```json می‌گذارند. قبل از parse حذفش کن.'),
  t('pe-iterate', 'prompt_engineering', 'all', 'پرامپت را مثل کد نگه دار', 'پرامپتی که جواب داد را جایی ذخیره کن. دفعهٔ بعد از صفر ننویس — ویرایشش کن.'),
  t('pe-persona-audience', 'prompt_engineering', 'domain_expert', 'مخاطب خروجی را مشخص کن', '«برای مدیر مالی بنویس» و «برای کارشناس تازه‌وارد بنویس» دو متن کاملاً متفاوت می‌دهند.'),
  t('pe-constraints', 'prompt_engineering', 'all', 'محدودیت عددی بگذار', '«حداکثر ۱۰۰ کلمه» یا «دقیقاً ۵ مورد» خروجی را قابل‌استفاده‌تر از «کوتاه بنویس» می‌کند.'),
  t('pe-stepwise', 'prompt_engineering', 'all', 'کار چندمرحله‌ای را مرحله‌مرحله بخواه', 'یک پرامپت برای استخراج، یکی برای تحلیل، یکی برای نوشتن. یک پرامپت غول‌پیکر همیشه بدتر جواب می‌دهد.'),
  t('pe-verify', 'prompt_engineering', 'all', 'از مدل بخواه کارش را نقد کند', 'بعد از گرفتن جواب بپرس «چه جای این جواب ممکن است اشتباه باشد؟» — اغلب خودش خطا را پیدا می‌کند.'),
  t('pe-source', 'prompt_engineering', 'all', 'ارجاع بخواه', 'اگر از متنی که داده‌ای جواب می‌سازد، بخواه به بخش مربوطه ارجاع بدهد. ارجاع نداشتن نشانهٔ حدس زدن است.'),
  t('pe-no-hallucination', 'prompt_engineering', 'all', 'اجازهٔ «نمی‌دانم» بده', 'صریح بنویس «اگر در متن نبود، بنویس نامشخص». بدون این اجازه، مدل جای خالی را پر می‌کند.'),
  t('pe-language', 'prompt_engineering', 'all', 'زبان خروجی را تعیین کن', 'اگر ورودی انگلیسی و خروجی فارسی می‌خواهی، صریح بگو. وگرنه مدل زبان ورودی را ادامه می‌دهد.'),
  t('pe-system', 'prompt_engineering', 'builder', 'قواعد ثابت را در system بگذار', 'چیزی که در همهٔ فراخوانی‌ها ثابت است جای system message است، نه اینکه هر بار در پرامپت کاربر تکرار شود.'),
  t('pe-token-cost', 'prompt_engineering', 'builder', 'زمینهٔ بی‌مصرف را حذف کن', 'هر توکن اضافه هم هزینه است هم حواس‌پرتی. فقط بخشی از سند را بفرست که واقعاً لازم است.'),
  t('pe-delimiters', 'prompt_engineering', 'all', 'ورودی را با جداکننده مشخص کن', 'متن کاربر را بین ### یا <doc></doc> بگذار تا مدل مرز دستور و داده را گم نکند.'),
  t('pe-rubric', 'prompt_engineering', 'domain_expert', 'معیار ارزیابی بده', 'اگر می‌خواهی چیزی را بسنجد، معیارها را خودت فهرست کن. «خوب است یا نه؟» جواب بی‌فایده می‌دهد.'),
];

/* ─────────────── ۲. ترفندهای ابزار (Cursor / Claude Code) ───────────── */
const AI_TOOLS: SeedTip[] = [
  t('at-cursor-context', 'ai_tools', 'builder', 'Cursor: فایل‌های مرتبط را دستی بچسبان', 'با @ فایل‌های مرتبط را به context اضافه کن. حدس زدن خودکار پروژه‌های بزرگ را اشتباه می‌فهمد.'),
  t('at-cursor-rules', 'ai_tools', 'builder', 'Cursor: فایل rules بساز', 'قواعد پروژه (سبک کد، کتابخانه‌های مجاز) را در .cursorrules بنویس تا هر بار تکرارشان نکنی.'),
  t('at-claude-md', 'ai_tools', 'builder', 'Claude Code: از CLAUDE.md استفاده کن', 'قواعد و ساختار پروژه را در CLAUDE.md بگذار. در هر جلسه خوانده می‌شود و از توضیح تکراری جلوگیری می‌کند.'),
  t('at-claude-plan', 'ai_tools', 'builder', 'اول نقشه، بعد کد', 'از ابزار بخواه قبل از نوشتن کد نقشهٔ کارش را بگوید. اصلاح یک نقشه ارزان‌تر از اصلاح ۳۰۰ خط کد است.'),
  t('at-small-tasks', 'ai_tools', 'builder', 'یک تغییر در هر درخواست', 'دو feature در یک پرامپت یعنی review سخت‌تر و خطای بیشتر. یکی‌یکی بخواه.'),
  t('at-review-diff', 'ai_tools', 'builder', 'diff را بخوان، نه خروجی را', 'قبل از commit همیشه diff را بررسی کن. کدی که کار می‌کند لزوماً کدی نیست که می‌خواستی.'),
  t('at-tests-first', 'ai_tools', 'builder', 'تست را هم بخواه', 'وقتی منطقی می‌سازی، در همان درخواست تست هم بخواه. تست بعداً نوشتن معمولاً یعنی هیچ‌وقت.'),
  t('at-git-checkpoint', 'ai_tools', 'builder', 'قبل از تغییر بزرگ commit کن', 'یک commit تمیز قبل از شروع یعنی می‌توانی بدون ترس reset کنی اگر مسیر اشتباه رفت.'),
  t('at-reject-fast', 'ai_tools', 'builder', 'خروجی بد را وصله نکن', 'اگر تولید اول مسیر را اشتباه رفت، دور بینداز و پرامپت را عوض کن. اصلاح دستی کد AIِ بدمسیر وقت‌کش‌تر است.'),
  t('at-terminal', 'ai_tools', 'builder', 'خروجی خطا را کامل بده', 'کل stack trace را بچسبان، نه فقط خط آخر. خط آخر معمولاً معلول است نه علت.'),
  t('at-chatgpt-projects', 'ai_tools', 'all', 'گفت‌وگوها را دسته‌بندی کن', 'برای هر کار جاری یک فضای جدا بساز تا زمینه قاطی نشود و بتوانی برگردی.'),
  t('at-voice', 'ai_tools', 'domain_expert', 'دیکته کن، بعد ویرایش', 'برای پیش‌نویس طولانی، حرف زدن سریع‌تر از تایپ است. متن خام را بده مدل مرتبش کند.'),
  t('at-screenshot', 'ai_tools', 'all', 'تصویر هم ورودی است', 'اسکرین‌شات جدول، فرم یا نمودار را مستقیم بده؛ لازم نیست دستی بازتایپ کنی.'),
  t('at-compare-models', 'ai_tools', 'all', 'یک کار را با دو مدل امتحان کن', 'برای کار مهم، همان پرامپت را به دو مدل بده. اختلاف جواب‌ها نقاط عدم‌قطعیت را نشان می‌دهد.'),
  t('at-save-prompts', 'ai_tools', 'all', 'کتابخانهٔ پرامپت شخصی بساز', 'پرامپت‌های پرتکرارت را در یک فایل نگه دار. بعد از یک ماه به یک ابزار واقعی تبدیل می‌شود.'),
  t('at-no-secrets', 'ai_tools', 'all', 'داده حساس را نفرست', 'کلید، رمز، شمارهٔ پرسنلی و داده مشتری را در پرامپت نگذار — حتی در ابزار داخلی.'),
  t('at-refactor-scope', 'ai_tools', 'builder', 'refactor را محدود کن', '«این فایل را تمیز کن» یعنی تغییرات غیرقابل‌بازبینی. بگو دقیقاً کدام تابع و چرا.'),
  t('at-explain-code', 'ai_tools', 'builder', 'کد ناآشنا را توضیح بخواه', 'قبل از تغییر کد قدیمی، از ابزار بخواه خط‌به‌خط توضیحش دهد. سریع‌تر از خواندن دستی است.'),
  t('at-commit-msg', 'ai_tools', 'builder', 'پیام commit را از diff بساز', 'diff را بده و پیام بخواه، اما خودت بازنویسی کن — «چرا» را فقط تو می‌دانی.'),
  t('at-boilerplate', 'ai_tools', 'builder', 'کار تکراری را واگذار کن', 'تبدیل فرمت، ساخت type از JSON، نوشتن migration ساده — این‌ها بهترین کاربرد ابزار است.'),
  t('at-dont-trust-api', 'ai_tools', 'builder', 'امضای API را چک کن', 'مدل‌ها متد و پارامتری می‌سازند که وجود ندارد. مستند رسمی را باز کن.'),
  t('at-iterate-ui', 'ai_tools', 'builder', 'UI را با تصویر مرجع بخواه', 'یک اسکرین‌شات از چیزی که می‌خواهی بده. توصیف کلامی طرح همیشه ناقص است.'),
];

/* ──────────── ۳. AI در کار تخصصی (AI in domain work) ─────────────────── */
const AI_IN_DOMAIN: SeedTip[] = [
  t('ad-meeting-notes', 'ai_in_domain', 'all', 'صورت‌جلسه را به تصمیم تبدیل کن', 'به‌جای خلاصهٔ جلسه، بخواه «تصمیم‌ها، مسئول هرکدام، و مهلت» را جدا کند.'),
  t('ad-email-draft', 'ai_in_domain', 'domain_expert', 'پیش‌نویس بگیر، نه متن نهایی', 'ایمیل حساس را خودت بازنویسی کن. پیش‌نویس AI لحن سازمانی تو را ندارد.'),
  t('ad-jd', 'ai_in_domain', 'domain_expert', 'شرح شغل را از مهارت بساز', 'فهرست مهارت‌های واقعی تیم را بده و بخواه شرح شغل بنویسد — نتیجه از قالب آماده دقیق‌تر است.'),
  t('ad-cv-screen', 'ai_in_domain', 'domain_expert', 'غربال رزومه با معیار صریح', 'معیارها را عددی و صریح بده. بدون آن، مدل بر اساس کلیدواژه قضاوت می‌کند نه صلاحیت.'),
  t('ad-cv-bias', 'ai_in_domain', 'domain_expert', 'تصمیم نهایی استخدام با انسان است', 'از AI برای مرتب‌سازی و خلاصه استفاده کن، نه برای رد کردن. سوگیری در داده آموزش هست.'),
  t('ad-policy-qa', 'ai_in_domain', 'domain_expert', 'از آیین‌نامه سؤال بپرس', 'متن آیین‌نامه را بده و سؤال بپرس. سریع‌تر از Ctrl+F است و ارجاع هم می‌دهد.'),
  t('ad-onboarding', 'ai_in_domain', 'domain_expert', 'مسیر ورود کارمند جدید بساز', 'شرح شغل و ابزارهای تیم را بده و بخواه چک‌لیست ۳۰ روز اول بنویسد.'),
  t('ad-survey', 'ai_in_domain', 'domain_expert', 'پاسخ‌های باز نظرسنجی را دسته‌بندی کن', 'صدها پاسخ متنی را بده و بخواه به ۵ تم اصلی با نمونه دسته‌بندی کند.'),
  t('ad-invoice', 'ai_in_domain', 'domain_expert', 'دسته‌بندی هزینه را خودکار کن', 'شرح هزینه‌ها را بده و بخواه بر اساس سرفصل‌های حسابداری خودت طبقه‌بندی کند.'),
  t('ad-reconcile', 'ai_in_domain', 'domain_expert', 'مغایرت‌گیری را با AI شروع کن', 'دو فهرست را بده و بخواه اختلاف‌ها را با دلیل احتمالی بیرون بکشد. تأیید نهایی با تو.'),
  t('ad-forecast-explain', 'ai_in_domain', 'domain_expert', 'عدد را به روایت تبدیل کن', 'جدول بودجه را بده و بخواه در سه بند برای هیئت‌مدیره توضیح دهد چه چیزی تغییر کرده و چرا.'),
  t('ad-ticket-triage', 'ai_in_domain', 'domain_expert', 'تیکت‌ها را اولویت‌بندی کن', 'معیار فوریت خودت را بده و بخواه تیکت‌های امروز را مرتب کند.'),
  t('ad-faq', 'ai_in_domain', 'domain_expert', 'FAQ را از تیکت‌های قدیمی بساز', '۱۰۰ تیکت گذشته را بده و بخواه ۲۰ سؤال پرتکرار با جواب استخراج کند.'),
  t('ad-response-tone', 'ai_in_domain', 'domain_expert', 'یک پاسخ، سه لحن', 'بخواه یک پاسخ را در سه لحن (رسمی، دوستانه، عذرخواهانه) بنویسد و بهترین را انتخاب کن.'),
  t('ad-contract-risk', 'ai_in_domain', 'domain_expert', 'بندهای پرریسک قرارداد را علامت بزن', 'قرارداد را بده و بخواه بندهایی که تعهد یک‌طرفه ایجاد می‌کنند را فهرست کند. جایگزین مشاور حقوقی نیست.'),
  t('ad-translate-term', 'ai_in_domain', 'all', 'واژه‌نامهٔ خودت را بده', 'برای ترجمهٔ متن تخصصی، فهرست معادل‌های سازمانی را همراه متن بفرست.'),
  t('ad-process-map', 'ai_in_domain', 'domain_expert', 'فرایند را مکتوب کن', 'مراحل کار را شفاهی توضیح بده و بخواه به فرایند مرحله‌به‌مرحله تبدیلش کند. مستندسازی از صفر سخت است.'),
  t('ad-training', 'ai_in_domain', 'domain_expert', 'سناریوی آموزشی بساز', 'برای آموزش تیم، بخواه موقعیت‌های واقعی با چند گزینهٔ پاسخ بسازد.'),
  t('ad-kpi', 'ai_in_domain', 'domain_expert', 'شاخص را قابل‌اندازه‌گیری کن', 'هدف مبهم را بده و بخواه به شاخص عددی با روش اندازه‌گیری تبدیلش کند.'),
  t('ad-brief', 'ai_in_domain', 'domain_expert', 'بریف را قبل از جلسه بساز', 'مستندات پراکنده را بده و بخواه یک صفحه بریف برای جلسه بنویسد.'),
  t('ad-check-numbers', 'ai_in_domain', 'all', 'محاسبات را خودت بررسی کن', 'مدل‌ها در حساب اشتباه می‌کنند. برای عدد مهم، از ابزار حساب استفاده کن نه از حافظهٔ مدل.'),
  t('ad-start-small', 'ai_in_domain', 'domain_expert', 'از یک کار هفتگی شروع کن', 'یک کار تکراری هفتگی را انتخاب کن و فقط همان را خودکار کن. تحول یکجا شکست می‌خورد.'),
];

/* ─────────────────── ۴. راهنمای پلتفرم (platform how-to) ────────────── */
const PLATFORM: SeedTip[] = [
  t('pl-github-verify', 'platform', 'builder', 'لینک GitHub مهارتت را تأیید می‌کند', 'پروژه‌ای که لینک مخزن عمومی دارد، مهارت‌هایش با تحلیل خودکار مخزن بررسی می‌شود.'),
  t('pl-readme', 'platform', 'builder', 'README خالی یعنی تأیید کمتر', 'اگر مخزن README نداشته باشد، اطمینان همهٔ مهارت‌ها پایین‌تر حساب می‌شود. چند خط بنویس.'),
  t('pl-readme-evidence', 'platform', 'builder', 'در README شواهد بگذار', 'نام کتابخانه‌ها، ساختار پوشه‌ها و یک نمونهٔ خروجی بنویس — همان چیزی است که تأیید مهارت به آن نگاه می‌کند.'),
  t('pl-claimed-vs-verified', 'platform', 'all', 'فرق claimed و تأییدشده', 'مهارت بدون نشان یعنی ادعای خودت؛ با نشان سبز یعنی شواهدی در یک مخزن واقعی پیدا شده.'),
  t('pl-manual-verify', 'platform', 'all', 'تأیید دستی پابرجا می‌ماند', 'مهارتی که مدیر دستی تأیید کرده، هیچ‌وقت با تحلیل خودکار پایین نمی‌آید.'),
  t('pl-idea-no-code', 'platform', 'domain_expert', 'برای ثبت ایده کد لازم نیست', 'اگر مسئله‌ای از کار روزمره‌ات می‌شناسی، ایده‌اش را ثبت کن. ساختنش کار دیگری است.'),
  t('pl-idea-problem-first', 'platform', 'all', 'در ایده، مسئله مهم‌تر از راه‌حل است', 'بخش «مسئله چیست؟» را با یک نمونهٔ واقعی پر کن. راه‌حل بدون مسئلهٔ روشن بررسی نمی‌شود.'),
  t('pl-idea-draft', 'platform', 'all', 'ایده را پیش‌نویس نگه دار', 'ثبت اولیه پیش‌نویس است؛ تا وقتی تصمیم نهایی نگرفته‌اند می‌توانی ویرایشش کنی.'),
  t('pl-idea-ip', 'platform', 'all', 'مالکیت ایده را روشن کن', 'ممکن است کسی دیگر ایده‌ات را بسازد. همان اول مشخص کن مالکیت با کیست.'),
  t('pl-idea-metric', 'platform', 'all', 'برای ایده معیار موفقیت بنویس', 'عددی که قرار است تغییر کند را بنویس. «بهتر می‌شود» قابل بررسی نیست.'),
  t('pl-spotlight', 'platform', 'all', 'Spotlight هر هفته عوض می‌شود', 'یک مسئله هر هفته برجسته می‌شود. برندهٔ آن هفته نشان Spotlight Solver می‌گیرد.'),
  t('pl-spotlight-points', 'platform', 'all', 'بردن Spotlight بیشترین امتیاز را دارد', 'در رتبه‌بندی هفتگی، برد Spotlight سنگین‌ترین وزن را دارد.'),
  t('pl-weekly-reset', 'platform', 'all', 'رتبه‌بندی هفتگی صفر می‌شود', 'هر شنبه از نو شروع می‌شود. یک هفتهٔ ضعیف تا ابد همراهت نمی‌ماند.'),
  t('pl-groups', 'platform', 'all', 'رتبه‌بندی گروه‌بندی‌شده است', 'سازنده‌ها، متخصص‌های حوزه‌ای و ترکیبی جدا رتبه‌بندی می‌شوند تا مقایسه منصفانه باشد.'),
  t('pl-role-badge', 'platform', 'all', 'نشان نقش، رتبه نیست', 'Builder / Domain Expert / Hybrid هویت است، نه درجه. هیچ‌کدام بالاتر از دیگری نیست.'),
  t('pl-domain-expertise', 'platform', 'domain_expert', 'حوزهٔ تخصصت را پر کن', 'با ثبت حوزهٔ تخصصی، در صفحهٔ چالش‌های مرتبط دیده می‌شوی و ایده‌ها برای اعتبارسنجی به تو می‌رسند.'),
  t('pl-upvote', 'platform', 'all', 'رأی دادن هم مشارکت است', 'رأی به پروژهٔ دیگران برای صاحبش امتیاز هفتگی می‌سازد و کار خوب را بالا می‌آورد.'),
  t('pl-no-self-upvote', 'platform', 'all', 'به پروژهٔ خودت رأی نمی‌رسد', 'رأی به پروژهٔ خودت شمرده نمی‌شود — عمدی است.'),
  t('pl-stage', 'platform', 'builder', 'مرحلهٔ پروژه را صادقانه بگذار', 'Experiment بودن عیب نیست. مرحلهٔ درست، انتظار بیننده را تنظیم می‌کند.'),
  t('pl-personal-project', 'platform', 'all', 'تأیید مالکیت اجباری است', 'هر پروژه باید تأیید کند که شخصی است و مالکیت معنوی کسی را نقض نمی‌کند. این یک حفاظ حقوقی است.'),
  t('pl-challenge-propose', 'platform', 'all', 'مسئله پیشنهاد بده', 'لازم نیست منتظر بمانی؛ خودت می‌توانی مسئلهٔ جدیدی برای یک چالش پیشنهاد کنی.'),
  t('pl-profile-complete', 'platform', 'all', 'پروفایل کامل بیشتر دیده می‌شود', 'عنوان شغلی و بایو در جست‌وجوی افراد استفاده می‌شود. خالی گذاشتنشان یعنی پیدا نشدن.'),
  t('pl-ai-tools-tag', 'platform', 'all', 'ابزار AI پروژه‌ات را ثبت کن', 'اینکه با Cursor یا Claude Code ساخته‌ای بخشی از داستان پروژه است، نه چیزی برای پنهان کردن.'),
  t('pl-tip-no-points', 'platform', 'all', 'این نکته‌ها امتیاز ندارند', 'عمدی است — اگر خواندن نکته امتیاز داشت، همه بدون خواندن ردش می‌کردند.'),
];

const ALL_TIPS: SeedTip[] = [...PROMPT_ENGINEERING, ...AI_TOOLS, ...AI_IN_DOMAIN, ...PLATFORM];

async function main() {
  const slugs = new Set(ALL_TIPS.map((x) => x.slug));
  if (slugs.size !== ALL_TIPS.length) throw new Error('duplicate tip slug in the pool');

  await db
    .insert(tips)
    .values(ALL_TIPS)
    .onConflictDoUpdate({
      target: tips.slug,
      set: {
        title: sqlExcluded('title'),
        body: sqlExcluded('body'),
        category: sqlExcluded('category'),
        audience: sqlExcluded('audience'),
      },
    });

  const byCategory = ALL_TIPS.reduce<Record<string, number>>((acc, x) => {
    acc[x.category] = (acc[x.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[seed:tips] ${ALL_TIPS.length} tips seeded`, byCategory);
  process.exit(0);
}

/** `excluded.<col>` — the value Postgres was about to insert, for DO UPDATE. */
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`);
}


main().catch((err) => {
  console.error('[seed:tips] failed:', err);
  process.exit(1);
});
