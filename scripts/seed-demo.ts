/**
 * Demo data seed — idempotent. Run: `npm run db:seed:demo`
 * (requires `npm run db:seed` first — needs org, skills, domains, challenges, badges).
 *
 * Seeds a populated, browsable network: ~11 members across all personas, projects
 * (some linked to challenge problems), and one spotlighted problem — so the
 * People / Projects / Challenges directories look alive.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { and, eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import {
  orgs,
  users,
  skills,
  userSkills,
  domains,
  userDomainExpertise,
  projects,
  projectSkills,
  projectAiTools,
  projectChallengeProblems,
  challenges,
  challengeProblems,
  badges,
  userBadges,
} from '../lib/db/schema';

const db = getDb();

type Stage = 'experiment' | 'weekend_hack' | 'building' | 'shipped' | 'maintained';
type ProblemLink = { challenge: string; problem: string };
type DemoProject = {
  title: string;
  description: string;
  stage: Stage;
  upvotes: number;
  github?: string;
  aiTools?: string[];
  problems?: ProblemLink[];
};
type DemoUser = {
  email: string;
  username: string;
  name: string;
  roleTitle: string;
  bio: string;
  githubUsername?: string;
  onboardingChoice: 'builder' | 'domain_expert' | 'hybrid';
  skills: { slug: string; level: number; verified?: boolean }[];
  domains: { slug: string; years?: number }[];
  projects: DemoProject[];
  badges: string[];
};

const DEMO_USERS: DemoUser[] = [
  {
    email: 'sara.karimi@aigraph.local', username: 'sara-karimi', name: 'سارا کریمی',
    roleTitle: 'مهندس یادگیری ماشین', githubUsername: 'sara-karimi', onboardingChoice: 'builder',
    bio: 'پنج سال سابقه در توسعه مدل‌های NLP فارسی و سیستم‌های توصیه‌گر. علاقه‌مند به تقاطع هوش مصنوعی و تجربه کاربری.',
    skills: [
      { slug: 'python', level: 5, verified: true }, { slug: 'pytorch', level: 4, verified: true },
      { slug: 'transformers', level: 4, verified: true }, { slug: 'nlp', level: 4, verified: true },
      { slug: 'fastapi', level: 3 }, { slug: 'react', level: 3 }, { slug: 'claude-api', level: 4, verified: true },
      { slug: 'docker', level: 2 }, { slug: 'postgresql', level: 2 }, { slug: 'hugging-face', level: 3, verified: true },
    ],
    domains: [],
    projects: [
      { title: 'دستیار نوشتاری فارسی', description: 'ابزاری برای بهبود متون فارسی با استفاده از مدل‌های زبانی بزرگ', stage: 'building', upvotes: 47, github: 'https://github.com/sara-karimi/persian-writing-assistant', aiTools: ['claude-code', 'cursor'], problems: [{ challenge: 'general', problem: 'ابزار داخلی مبتنی بر AI' }] },
      { title: 'سیستم توصیه‌گر محتوا', description: 'موتور پیشنهاد محتوای شخصی‌سازی شده برای پلتفرم‌های آموزشی', stage: 'shipped', upvotes: 83, github: 'https://github.com/sara-karimi/content-recommender', aiTools: ['chatgpt'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'maryam.rezaei@aigraph.local', username: 'maryam-rezaei', name: 'مریم رضایی',
    roleTitle: 'شریک تجاری منابع انسانی', onboardingChoice: 'domain_expert',
    bio: 'ده سال تجربه در منابع انسانی و توسعه‌ی سازمانی. با ابزارهای AI فرایندهای استخدام را بهبود می‌دهم. کد نمی‌نویسم، ولی با ابزارها می‌سازم.',
    skills: [{ slug: 'chatgpt', level: 2 }],
    domains: [{ slug: 'hr', years: 10 }, { slug: 'operations', years: 5 }],
    projects: [], badges: [],
  },
  {
    email: 'ali.mohammadi@aigraph.local', username: 'ali-mohammadi', name: 'علی محمدی',
    roleTitle: 'مدیر محصول فنی', githubUsername: 'ali-m', onboardingChoice: 'hybrid',
    bio: 'مدیر محصول با پس‌زمینه‌ی مهندسی. بین تیم‌های فنی و کسب‌وکار پل می‌زنم و با ابزارهای AI پروتوتایپ می‌سازم.',
    skills: [
      { slug: 'typescript', level: 4, verified: true }, { slug: 'react', level: 4, verified: true },
      { slug: 'nextjs', level: 4, verified: true }, { slug: 'nodejs', level: 3 },
      { slug: 'postgresql', level: 3 }, { slug: 'cursor', level: 3 },
    ],
    domains: [{ slug: 'product', years: 8 }, { slug: 'marketing', years: 3 }],
    projects: [
      { title: 'داشبورد تحلیل محصول', description: 'داشبورد تحلیل رفتار کاربر با نمودارهای زنده برای تیم محصول', stage: 'building', upvotes: 31, github: 'https://github.com/ali-m/product-analytics', aiTools: ['cursor', 'v0'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'reza.ahmadi@aigraph.local', username: 'reza-ahmadi', name: 'رضا احمدی',
    roleTitle: 'مهندس ارشد بک‌اند', githubUsername: 'reza-ahmadi', onboardingChoice: 'builder',
    bio: 'مهندس بک‌اند با تمرکز روی سیستم‌های توزیع‌شده و ابزارهای داخلی توسعه. عاشق Go و اتوماسیون.',
    skills: [
      { slug: 'go', level: 5, verified: true }, { slug: 'python', level: 4, verified: true },
      { slug: 'postgresql', level: 4, verified: true }, { slug: 'docker', level: 4, verified: true },
      { slug: 'kubernetes', level: 3 }, { slug: 'redis', level: 3 }, { slug: 'claude-code', level: 4 },
    ],
    domains: [],
    projects: [
      { title: 'خلاصه‌ساز خودکار Code Review', description: 'ابزاری که تغییرات یک PR را می‌خواند و نکات مهم بازبینی را برجسته می‌کند', stage: 'shipped', upvotes: 64, github: 'https://github.com/reza-ahmadi/pr-summarizer', aiTools: ['claude-code'], problems: [{ challenge: 'engineering', problem: 'خلاصه‌ساز Code Review' }] },
      { title: 'مانیتور سلامت سرویس‌ها', description: 'داشبورد سبک برای پایش سلامت میکروسرویس‌ها', stage: 'maintained', upvotes: 22, github: 'https://github.com/reza-ahmadi/svc-monitor' },
    ],
    badges: ['first-project'],
  },
  {
    email: 'nazanin.hosseini@aigraph.local', username: 'nazanin-hosseini', name: 'نازنین حسینی',
    roleTitle: 'مهندس فرانت‌اند', githubUsername: 'nazanin-h', onboardingChoice: 'builder',
    bio: 'فرانت‌اند دولوپر با وسواس روی جزئیات تجربه‌ی کاربری و طراحی. با v0 و Cursor سریع پروتوتایپ می‌زنم.',
    skills: [
      { slug: 'typescript', level: 5, verified: true }, { slug: 'react', level: 5, verified: true },
      { slug: 'nextjs', level: 4, verified: true }, { slug: 'tailwind-css', level: 4, verified: true },
      { slug: 'v0', level: 4 }, { slug: 'cursor', level: 3 },
    ],
    domains: [],
    projects: [
      { title: 'کتابخانه‌ی کامپوننت فارسی', description: 'مجموعه کامپوننت‌های RTL و دسترس‌پذیر برای اپ‌های فارسی', stage: 'building', upvotes: 39, github: 'https://github.com/nazanin-h/persian-ui', aiTools: ['v0', 'cursor'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'kaveh.jafari@aigraph.local', username: 'kaveh-jafari', name: 'کاوه جعفری',
    roleTitle: 'مهندس فول‌استک AI', githubUsername: 'kaveh-j', onboardingChoice: 'builder',
    bio: 'فول‌استک با تمرکز روی اپ‌های مبتنی بر LLM و RAG. از ایده تا محصول را خودم می‌سازم.',
    skills: [
      { slug: 'typescript', level: 4, verified: true }, { slug: 'python', level: 4, verified: true },
      { slug: 'rag', level: 5, verified: true }, { slug: 'langchain', level: 4, verified: true },
      { slug: 'ai-agents', level: 4 }, { slug: 'nextjs', level: 3 }, { slug: 'vector-databases', level: 3, verified: true },
    ],
    domains: [],
    projects: [
      { title: 'بات پرسش و پاسخ اسناد داخلی', description: 'دستیار مبتنی بر RAG روی مجموعه اسناد عمومی سازمان', stage: 'shipped', upvotes: 91, github: 'https://github.com/kaveh-j/docs-rag', aiTools: ['claude-api', 'langchain'], problems: [{ challenge: 'general', problem: 'دستیار جستجوی اسناد داخلی (RAG)' }] },
      { title: 'دسته‌بند هوشمند تیکت', description: 'طبقه‌بندی خودکار تیکت‌های پشتیبانی بر اساس موضوع و اولویت', stage: 'building', upvotes: 44, github: 'https://github.com/kaveh-j/ticket-classifier', aiTools: ['claude-code'], problems: [{ challenge: 'customer_success', problem: 'دسته‌بند تیکت‌های پشتیبانی' }] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'shirin.moradi@aigraph.local', username: 'shirin-moradi', name: 'شیرین مرادی',
    roleTitle: 'دانشمند داده', githubUsername: 'shirin-m', onboardingChoice: 'builder',
    bio: 'دانشمند داده با تمرکز روی مدل‌های پیش‌بینی و تحلیل مالی. Python و نوت‌بوک، رفیق‌های همیشگی‌ام.',
    skills: [
      { slug: 'python', level: 5, verified: true }, { slug: 'machine-learning', level: 4, verified: true },
      { slug: 'pytorch', level: 3 }, { slug: 'postgresql', level: 3 }, { slug: 'chatgpt', level: 3 },
    ],
    domains: [{ slug: 'finance', years: 4 }],
    projects: [
      { title: 'دستیار پیش‌بینی بودجه', description: 'مدل ساده برای تخمین روند بودجه‌ی سه‌ماهه بر اساس داده‌ی تاریخی', stage: 'building', upvotes: 53, github: 'https://github.com/shirin-m/budget-forecast', aiTools: ['chatgpt'], problems: [{ challenge: 'finance', problem: 'دستیار پیش‌بینی بودجه' }] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'farhad.karimi@aigraph.local', username: 'farhad-karimi', name: 'فرهاد کریمی',
    roleTitle: 'تحلیل‌گر ارشد مالی', onboardingChoice: 'domain_expert',
    bio: 'دوازده سال تجربه در تحلیل مالی و بودجه‌ریزی. با ابزارهای AI گزارش‌ها را سریع‌تر و دقیق‌تر می‌کنم.',
    skills: [{ slug: 'chatgpt', level: 3 }],
    domains: [{ slug: 'finance', years: 12 }],
    projects: [], badges: [],
  },
  {
    email: 'elham.sadeghi@aigraph.local', username: 'elham-sadeghi', name: 'الهام صادقی',
    roleTitle: 'مدیر موفقیت مشتری', onboardingChoice: 'domain_expert',
    bio: 'رهبری تیم پشتیبانی و موفقیت مشتری. عاشق پیدا کردن جاهایی که AI می‌تواند تجربه‌ی مشتری را بهتر کند.',
    skills: [{ slug: 'chatgpt', level: 2 }],
    domains: [{ slug: 'customer_success', years: 7 }],
    projects: [], badges: [],
  },
  {
    email: 'bahram.nikoo@aigraph.local', username: 'bahram-nikoo', name: 'بهرام نیکو',
    roleTitle: 'مشاور حقوقی', onboardingChoice: 'domain_expert',
    bio: 'مشاور حقوقی شرکتی با علاقه به اتوماسیون قراردادها با ابزارهای هوش مصنوعی.',
    skills: [{ slug: 'chatgpt', level: 2 }],
    domains: [{ slug: 'legal', years: 9 }],
    projects: [], badges: [],
  },
  {
    email: 'mahsa.tehrani@aigraph.local', username: 'mahsa-tehrani', name: 'مهسا تهرانی',
    roleTitle: 'رهبر رشد و بازاریابی', githubUsername: 'mahsa-t', onboardingChoice: 'hybrid',
    bio: 'بین بازاریابی و مهندسی رشد ایستاده‌ام. با ابزارهای بدون‌کد و کدنویسی سبک، کمپین‌ها را خودکار می‌کنم.',
    skills: [
      { slug: 'python', level: 3 }, { slug: 'sql', level: 3, verified: true },
      { slug: 'prompt-engineering', level: 4, verified: true }, { slug: 'chatgpt', level: 4 },
    ],
    domains: [{ slug: 'marketing', years: 6 }],
    projects: [
      { title: 'تولیدکننده‌ی محتوای کمپین', description: 'ابزاری برای تولید سریع پیش‌نویس محتوای بازاریابی چندکاناله', stage: 'weekend_hack', upvotes: 27, aiTools: ['chatgpt'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'amir.tehrani@aigraph.local', username: 'amir-tehrani', name: 'امیر تهرانی',
    roleTitle: 'مهندس DevOps', githubUsername: 'amir-t', onboardingChoice: 'builder',
    bio: 'اتوماسیون زیرساخت و CI/CD. عاشق ساختن سیستم‌هایی که خودشان کار می‌کنند.',
    skills: [{ slug: 'docker', level: 5, verified: true }, { slug: 'kubernetes', level: 4, verified: true }, { slug: 'terraform', level: 4, verified: true }, { slug: 'aws', level: 4 }, { slug: 'linux', level: 5, verified: true }, { slug: 'github-actions', level: 3 }],
    domains: [{ slug: 'operations', years: 6 }],
    projects: [
      { title: 'خط لوله‌ی استقرار خودکار', description: 'ابزار CI/CD سبک برای استقرار بی‌دردسر سرویس‌ها', stage: 'shipped', upvotes: 38, github: 'https://github.com/amir-t/autodeploy', aiTools: ['claude-code'] },
      { title: 'مانیتور هزینه‌ی ابری', description: 'داشبورد پایش هزینه‌ی زیرساخت ابری با هشدار', stage: 'building', upvotes: 19 },
    ],
    badges: ['first-project'],
  },
  {
    email: 'leila.ahmadi@aigraph.local', username: 'leila-ahmadi', name: 'لیلا احمدی',
    roleTitle: 'پژوهشگر یادگیری ماشین', githubUsername: 'leila-a', onboardingChoice: 'builder',
    bio: 'پژوهش در بینایی ماشین و مدل‌های چندوجهی. از مقاله تا محصول.',
    skills: [{ slug: 'python', level: 5, verified: true }, { slug: 'pytorch', level: 5, verified: true }, { slug: 'computer-vision', level: 4, verified: true }, { slug: 'deep-learning', level: 4, verified: true }, { slug: 'transformers', level: 3 }, { slug: 'hugging-face', level: 3, verified: true }],
    domains: [],
    projects: [
      { title: 'تشخیص اسناد فارسی', description: 'مدل بینایی ماشین برای استخراج داده از اسناد اسکن‌شده', stage: 'building', upvotes: 56, github: 'https://github.com/leila-a/doc-vision', aiTools: ['hugging-face'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'hossein.rezaei@aigraph.local', username: 'hossein-rezaei', name: 'حسین رضایی',
    roleTitle: 'توسعه‌دهنده‌ی موبایل', githubUsername: 'hossein-r', onboardingChoice: 'builder',
    bio: 'اپ‌های موبایل با React Native و تجربه‌ی روان. طرفدار سادگی.',
    skills: [{ slug: 'react-native', level: 5, verified: true }, { slug: 'typescript', level: 4, verified: true }, { slug: 'react', level: 4 }, { slug: 'nodejs', level: 3 }, { slug: 'cursor', level: 4 }],
    domains: [],
    projects: [{ title: 'اپ همیار مطالعه', description: 'اپلیکیشن موبایل برای برنامه‌ریزی و پیگیری مطالعه', stage: 'shipped', upvotes: 41, github: 'https://github.com/hossein-r/study-buddy', aiTools: ['cursor', 'v0'] }],
    badges: ['first-project'],
  },
  {
    email: 'parisa.karimi@aigraph.local', username: 'parisa-karimi', name: 'پریسا کریمی',
    roleTitle: 'طراح محصول', githubUsername: 'parisa-k', onboardingChoice: 'hybrid',
    bio: 'طراح محصول که با ابزارهای AI پروتوتایپ می‌سازد و به کد نزدیک است.',
    skills: [{ slug: 'react', level: 3, verified: true }, { slug: 'tailwind-css', level: 4, verified: true }, { slug: 'v0', level: 5 }, { slug: 'prompt-engineering', level: 4, verified: true }, { slug: 'chatgpt', level: 4 }],
    domains: [{ slug: 'product', years: 5 }],
    projects: [{ title: 'کیت طراحی سریع', description: 'مجموعه الگوهای رابط کاربری برای پروتوتایپ سریع با v0', stage: 'building', upvotes: 33, aiTools: ['v0', 'chatgpt'] }],
    badges: ['first-project'],
  },
  {
    email: 'arash.mohammadi@aigraph.local', username: 'arash-mohammadi', name: 'آرش محمدی',
    roleTitle: 'مهندس داده', githubUsername: 'arash-m', onboardingChoice: 'builder',
    bio: 'خطوط داده‌ی مقیاس‌پذیر و جریان‌های بلادرنگ. Kafka رفیق همیشگی‌ام است.',
    skills: [{ slug: 'python', level: 4, verified: true }, { slug: 'kafka', level: 4, verified: true }, { slug: 'postgresql', level: 4, verified: true }, { slug: 'elasticsearch', level: 3 }, { slug: 'docker', level: 3 }],
    domains: [],
    projects: [{ title: 'موتور جریان رویداد', description: 'زیرساخت پردازش رویداد بلادرنگ برای تحلیل', stage: 'maintained', upvotes: 29, github: 'https://github.com/arash-m/event-stream' }],
    badges: ['first-project'],
  },
  {
    email: 'golnaz.hosseini@aigraph.local', username: 'golnaz-hosseini', name: 'گلناز حسینی',
    roleTitle: 'کارشناس فناوری منابع انسانی', onboardingChoice: 'domain_expert',
    bio: 'هشت سال در منابع انسانی؛ عاشق خودکارسازی فرایندهای استخدام با AI.',
    skills: [{ slug: 'chatgpt', level: 3 }],
    domains: [{ slug: 'hr', years: 8 }, { slug: 'operations', years: 3 }],
    projects: [], badges: [],
  },
  {
    email: 'saeed.jafari@aigraph.local', username: 'saeed-jafari', name: 'سعید جعفری',
    roleTitle: 'مهندس امنیت', githubUsername: 'saeed-j', onboardingChoice: 'builder',
    bio: 'امنیت زیرساخت و تحلیل تهدید. کد امن، خواب راحت.',
    skills: [{ slug: 'go', level: 4, verified: true }, { slug: 'linux', level: 5, verified: true }, { slug: 'docker', level: 4 }, { slug: 'python', level: 3, verified: true }],
    domains: [],
    projects: [{ title: 'اسکنر آسیب‌پذیری داخلی', description: 'ابزار خط فرمان برای بررسی خودکار پیکربندی‌های ناامن', stage: 'shipped', upvotes: 47, github: 'https://github.com/saeed-j/vuln-scan', aiTools: ['claude-code'] }],
    badges: ['first-project'],
  },
  {
    email: 'neda.moradi@aigraph.local', username: 'neda-moradi', name: 'ندا مرادی',
    roleTitle: 'مهندس فرانت‌اند', githubUsername: 'neda-m', onboardingChoice: 'builder',
    bio: 'فرانت‌اند با تمرکز روی دسترس‌پذیری و کارایی. RTL برایم مقدس است.',
    skills: [{ slug: 'react', level: 5, verified: true }, { slug: 'nextjs', level: 4, verified: true }, { slug: 'typescript', level: 4, verified: true }, { slug: 'tailwind-css', level: 5, verified: true }, { slug: 'v0', level: 3 }],
    domains: [],
    projects: [{ title: 'داشبورد تحلیل بلادرنگ', description: 'رابط کاربری سریع و دسترس‌پذیر برای نمایش داده‌های زنده', stage: 'building', upvotes: 36, github: 'https://github.com/neda-m/live-dashboard', aiTools: ['cursor'] }],
    badges: ['first-project'],
  },
  {
    email: 'kian.nikoo@aigraph.local', username: 'kian-nikoo', name: 'کیان نیکو',
    roleTitle: 'سازنده‌ی عامل‌های AI', githubUsername: 'kian-n', onboardingChoice: 'builder',
    bio: 'عامل‌های خودمختار و سیستم‌های RAG. از ایده تا استقرار.',
    skills: [{ slug: 'python', level: 4, verified: true }, { slug: 'ai-agents', level: 5, verified: true }, { slug: 'langchain', level: 4, verified: true }, { slug: 'rag', level: 4, verified: true }, { slug: 'claude-api', level: 4, verified: true }, { slug: 'vector-databases', level: 3 }],
    domains: [],
    projects: [
      { title: 'عامل پژوهش خودکار', description: 'عاملی که موضوع را می‌گیرد و گزارش پژوهشی مستند تولید می‌کند', stage: 'building', upvotes: 72, github: 'https://github.com/kian-n/research-agent', aiTools: ['claude-code', 'langchain'] },
      { title: 'دستیار کدنویسی تیمی', description: 'بات کمک‌کننده در بازبینی کد و پاسخ به سؤالات فنی', stage: 'shipped', upvotes: 51, aiTools: ['claude-api'] },
    ],
    badges: ['first-project'],
  },
  {
    email: 'babak.sadeghi@aigraph.local', username: 'babak-sadeghi', name: 'بابک صادقی',
    roleTitle: 'مهندس بک‌اند', githubUsername: 'babak-s', onboardingChoice: 'builder',
    bio: 'APIهای تمیز و سیستم‌های قابل‌اتکا با Node و Postgres.',
    skills: [{ slug: 'nodejs', level: 5, verified: true }, { slug: 'nestjs', level: 4, verified: true }, { slug: 'typescript', level: 4, verified: true }, { slug: 'postgresql', level: 4, verified: true }, { slug: 'redis', level: 3 }, { slug: 'rest-api', level: 4 }],
    domains: [],
    projects: [{ title: 'API مدیریت اشتراک', description: 'سرویس مدیریت اشتراک و صورتحساب با معماری تمیز', stage: 'maintained', upvotes: 24, github: 'https://github.com/babak-s/subs-api' }],
    badges: ['first-project'],
  },
  {
    email: 'sahar.kaveh@aigraph.local', username: 'sahar-kaveh', name: 'سحر کاوه',
    roleTitle: 'تحلیل‌گر مالی', onboardingChoice: 'domain_expert',
    bio: 'تحلیل مالی و بودجه‌ریزی؛ با AI گزارش‌ها را سریع‌تر می‌سازم.',
    skills: [{ slug: 'chatgpt', level: 3 }],
    domains: [{ slug: 'finance', years: 7 }],
    projects: [], badges: [],
  },
];

async function main() {
  console.log('[seed-demo] starting…');
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org'));
  if (!org) throw new Error('org missing — run `npm run db:seed` first');

  const skillIdBySlug = new Map((await db.select({ id: skills.id, slug: skills.slug }).from(skills)).map((s) => [s.slug, s.id]));
  const domainIdBySlug = new Map((await db.select({ id: domains.id, slug: domains.slug }).from(domains)).map((d) => [d.slug, d.id]));
  const badgeIdBySlug = new Map((await db.select({ id: badges.id, slug: badges.slug }).from(badges)).map((b) => [b.slug, b.id]));
  if (skillIdBySlug.size === 0 || domainIdBySlug.size === 0) {
    throw new Error('taxonomy is empty — run `npm run db:seed` before `npm run db:seed:demo`');
  }

  // Problem lookup keyed by `${challengeSlug}::${problemTitle}` for project links.
  const problemRows = await db
    .select({ id: challengeProblems.id, title: challengeProblems.title, challengeSlug: challenges.slug })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id));
  const problemIdByKey = new Map(problemRows.map((p) => [`${p.challengeSlug}::${p.title}`, p.id]));

  for (const du of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        orgId: org.id, email: du.email, username: du.username, name: du.name,
        roleTitle: du.roleTitle, bio: du.bio, githubUsername: du.githubUsername,
        status: 'active', onboardingChoice: du.onboardingChoice, onboardingCompletedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.email });
    const [user] = await db.select().from(users).where(eq(users.email, du.email));

    if (du.skills.length) {
      await db
        .insert(userSkills)
        .values(
          du.skills.map((s) => {
            const skillId = skillIdBySlug.get(s.slug);
            if (!skillId) throw new Error(`unknown skill slug: ${s.slug}`);
            return {
              userId: user.id, skillId, claimedLevel: s.level, verified: !!s.verified,
              verificationSource: s.verified ? ('ai_repo_analysis' as const) : null,
              verifiedAt: s.verified ? new Date() : null,
            };
          }),
        )
        .onConflictDoNothing();
    }

    if (du.domains.length) {
      await db
        .insert(userDomainExpertise)
        .values(
          du.domains.map((d) => {
            const domainId = domainIdBySlug.get(d.slug);
            if (!domainId) throw new Error(`unknown domain slug: ${d.slug}`);
            return { userId: user.id, domainId, yearsExperience: d.years ?? null };
          }),
        )
        .onConflictDoNothing();
    }

    // Projects (+ skills + ai tools + challenge-problem links) — atomic, only if none yet.
    // Project skills reuse the first few of the owner's declared skills.
    const projectSkillSlugs = du.skills.slice(0, 4).map((s) => s.slug);
    if (du.projects.length) {
      await db.transaction(async (tx) => {
        const existingProject = await tx.select({ id: projects.id }).from(projects).where(eq(projects.userId, user.id)).limit(1);
        if (existingProject.length > 0) return;
        for (const p of du.projects) {
          const [proj] = await tx
            .insert(projects)
            .values({
              userId: user.id, orgId: org.id, title: p.title, description: p.description, stage: p.stage,
              upvoteCount: p.upvotes, status: 'published', isPersonalProjectConfirmed: true, githubUrl: p.github,
            })
            .returning({ id: projects.id });
          if (projectSkillSlugs.length) {
            await tx.insert(projectSkills).values(projectSkillSlugs.map((slug) => ({ projectId: proj.id, skillId: skillIdBySlug.get(slug)! }))).onConflictDoNothing();
          }
          if (p.aiTools?.length) {
            await tx.insert(projectAiTools).values(p.aiTools.map((t) => ({ projectId: proj.id, toolSlug: t }))).onConflictDoNothing();
          }
          for (const link of p.problems ?? []) {
            const problemId = problemIdByKey.get(`${link.challenge}::${link.problem}`);
            if (!problemId) throw new Error(`unknown problem: ${link.challenge}::${link.problem}`);
            await tx
              .insert(projectChallengeProblems)
              .values({
                projectId: proj.id,
                challengeProblemId: problemId,
                solutionDescription: `این پروژه به مسئله‌ی «${link.problem}» می‌پردازد: رویکرد، پیاده‌سازی و محدودیت‌ها در توضیحات پروژه آمده است.`,
                ipTermsAcceptedAt: new Date(),
              })
              .onConflictDoNothing();
          }
        }
      });
    }

    if (du.badges.length) {
      await db
        .insert(userBadges)
        .values(
          du.badges.map((b) => {
            const badgeId = badgeIdBySlug.get(b);
            if (!badgeId) throw new Error(`unknown badge slug: ${b}`);
            return { userId: user.id, badgeId };
          }),
        )
        .onConflictDoNothing();
    }

    console.log(`[seed-demo] ${du.username}: ${du.skills.length} skills, ${du.domains.length} domains, ${du.projects.length} projects`);
  }

  // Spotlight one general problem (demonstrates the Spotlight banner/badge).
  const spotlightId = problemIdByKey.get('general::ابزار داخلی مبتنی بر AI');
  if (spotlightId) {
    await db
      .update(challengeProblems)
      .set({ isSpotlight: true, spotlightStartsAt: new Date(), spotlightEndsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) })
      .where(and(eq(challengeProblems.id, spotlightId), eq(challengeProblems.isSpotlight, false)));
    console.log('[seed-demo] spotlight set on general::ابزار داخلی مبتنی بر AI');
  }

  console.log('[seed-demo] done ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-demo] failed:', err);
  process.exit(1);
});
