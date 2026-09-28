/**
 * IlmYo'l Data Layer
 * Separated state and business logic models for Doctoral Students, Supervisors, and Department.
 */

const IlmYolData = {
  currentRole: 'DOCTORAL_STUDENT', // DOCTORAL_STUDENT | SUPERVISOR | SCIENTIFIC_DEPARTMENT

  // Main Student Profile (Zulayho)
  student: {
    id: 'DOC-2024-089',
    name: 'Zulayho Qosimova',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    specialtyCode: '10.00.09',
    specialtyName: 'Jurnalistika va ommaviy kommunikatsiyalar',
    stageName: 'PhD, 2-bosqich (2-yil, 8-oy)',
    dayOfDoctorate: 624,
    totalDays: 1095, // 3 years
    topic: 'O‘zbekistonda korporativ ekologik mas’uliyat kommunikatsiyasining tashkilot imijini shakllantirishga ta’siri: strategik modellar va kommunikativ mexanizmlar',
    shortTopic: 'Korporativ ekologik kommunikatsiya va tashkilot imiji',
    supervisor: {
      name: 'Prof. Abdurahmon Rahimov',
      title: 'Filologiya fanlari doktori, professor',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      phone: '+998 90 123-45-67',
      email: 'a.rahimov@univ.uz',
      department: 'Jurnalistika va media menejmenti kafedrasi'
    },
    overallProgress: 47,
    statusLevel: 'Biroz ortda', // 'Reja bo‘yicha' | 'Biroz ortda' | 'Yuqori risk'
    yearlyProgress: {
      year1: 88,
      year2: 42,
      year3: 0
    },
    currentStage: {
      chapter: '2-bob',
      title: 'Empirik tadqiqot va tahlil',
      completedTasks: 6,
      totalTasks: 10,
      progressPercent: 60,
      nextTask: {
        id: 'T-204',
        title: 'Respondentlar ma’lumotlarini tahlil qilish (SPSS / Jamovi orqali korrelyatsion tahlil)',
        deadline: '28 sentabr 2026',
        daysLeft: 5,
        status: 'in_progress',
        evidenceCount: 2,
        priority: 'Yuqori',
        description: 'Toshkent shahri va viloyatlardagi 12 ta yirik sanoat va energetika korxonalari PR bo‘limlari hamda 420 nafar iste’molchilar o‘rtasida o‘tkazilgan so‘rovnoma ma’lumotlarini birlamchi tozalash va korrelyatsion matritsani shakllantirish.'
      }
    },
    risk: {
      level: 'O‘RTA RISK',
      badgeClass: 'risk-medium',
      reason: 'Empirik tadqiqot rejalashtirilgan muddatdan 12 kun ortda qolmoqda.',
      recommendation: 'Keyingi 7 kun ichida ma’lumot yig‘ishni yakunlash va dastlabki tahlil hisobotini rahbarga topshirish.',
      daysBehind: 12
    },
    nextDeadline: {
      title: 'Kuzgi attestatsiya',
      daysLeft: 18,
      date: '11 oktabr 2026',
      completedDocs: 3,
      totalDocs: 5,
      docList: [
        { name: 'Kafedra muhokamasi bayonnomasi', status: 'ready' },
        { name: 'Ilmiy rahbar xulosasi', status: 'ready' },
        { name: 'Bajarilgan ishlar to‘g‘risida hisobot', status: 'ready' },
        { name: '2-maqola qabul qilinganlik ma’lumotnomasi', status: 'pending' },
        { name: 'Empirik tahlil xomaki bobi', status: 'pending' }
      ]
    },
    todayTasks: [
      { id: 'task-1', text: '2.1-paragrafni tugatish (Empirik metodologiya bayoni)', deadline: '25 sentabr', done: false, priority: 'urgent' },
      { id: 'task-2', text: 'So‘rovnoma natijalarini Excelga kiritish va guruhlash', deadline: '27 sentabr', done: false, priority: 'normal' },
      { id: 'task-3', text: 'Maqolani ilmiy rahbarga ko‘rib chiqish uchun yuborish', deadline: '28 sentabr', done: false, priority: 'normal' },
      { id: 'task-4', text: 'Literature review (adabiyotlar tahlili) yangilandi va OAK talabiga moslashtirildi', deadline: '22 sentabr', done: true, priority: 'done' }
    ]
  },

  // 3-Year Detailed Roadmap
  roadmap: [
    {
      year: 1,
      title: '1-YIL: Nazariy-metodologik asoslar',
      status: 'completed',
      completion: 88,
      items: [
        { id: 'R1-1', title: 'Mavzu tasdiqlash va Ilmiy Kengash bayonnomasi', status: 'done', date: 'Noyabr 2024', evidence: 'Bayonnoma_№3.pdf' },
        { id: 'R1-2', title: 'Adabiyotlar tahlili (120 dan ortiq xalqaro manba)', status: 'done', date: 'Fevral 2025', evidence: 'Lit_Review_v2.docx' },
        { id: 'R1-3', title: '1-bob: Nazariy asoslar va xorijiy tajriba', status: 'done', date: 'May 2025', evidence: '1-bob_yakuniy.pdf' },
        { id: 'R1-4', title: '1-maqola: OAK ro‘yxatidagi jurnalda chop etish', status: 'done', date: 'Iyun 2025', evidence: 'OAK_Jurnal_Nashr_2025.pdf' }
      ]
    },
    {
      year: 2,
      title: '2-YIL: Empirik tadqiqot va modellashtirish',
      status: 'in_progress',
      completion: 42,
      items: [
        { id: 'R2-1', title: 'Tadqiqot metodologiyasi va so‘rovnoma instrumentariysi', status: 'done', date: 'Yanvar 2026', evidence: 'Metodologiya_tasdiq.pdf' },
        { id: 'R2-2', title: 'Empirik tadqiqot: 420 nafar respondent o‘rtasida so‘rov', status: 'current', date: 'Sentabr 2026', delay: true, evidence: 'Data_Survey_2026.xlsx' },
        { id: 'R2-3', title: '2-bob: Empirik tahlil va korporativ keyslar', status: 'future', date: 'Noyabr 2026' },
        { id: 'R2-4', title: '2-maqola: Scopus / Web of Science indeksidagi jurnal', status: 'future', date: 'Dekabr 2026' }
      ]
    },
    {
      year: 3,
      title: '3-YIL: Natijalar aprobatsiyasi va himoya',
      status: 'future',
      completion: 0,
      items: [
        { id: 'R3-1', title: '3-bob: Amaliy tavsiyalar va strategik model ishlab chiqish', status: 'future', date: 'Mart 2027' },
        { id: 'R3-2', title: 'Natijalar aprobatsiyasi (Vazirlik/korxonalarga joriy qilish dalolatnomasi)', status: 'future', date: 'May 2027' },
        { id: 'R3-3', title: 'Kafedra ilmiy seminari va dastlabki ekspertiza', status: 'future', date: 'Sentabr 2027' },
        { id: 'R3-4', title: 'Ixtisoslashgan Ilmiy Kengashda rasmiy himoya', status: 'future', date: 'Dekabr 2027' }
      ]
    }
  ],

  // Dissertation Chapters Progress
  dissertation: {
    overall: 49,
    chapters: [
      { id: 0, name: 'Kirish', progress: 90, pages: '14/15 bet', status: 'Deyarli tayyor' },
      { id: 1, name: '1-bob: Nazariy-konseptual asoslar', progress: 100, pages: '42 bet', status: 'Rahbar tasdiqlagan' },
      { id: 2, name: '2-bob: Empirik tadqiqot va amaliy tahlil', progress: 55, pages: '28/50 bet', status: 'Jarayonda' },
      { id: 3, name: '3-bob: Strategik modellar va tavsiyalar', progress: 0, pages: '0/40 bet', status: 'Boshlanmagan' },
      { id: 4, name: 'Xulosa va takliflar', progress: 0, pages: '0/10 bet', status: 'Boshlanmagan' }
    ]
  },

  // Scientific Publications
  publications: {
    required: 4,
    published: 2,
    underReview: 1,
    missing: 1,
    list: [
      {
        id: 'PUB-1',
        title: 'Korporativ kommunikatsiyada ekologik diskurs: O‘zbekiston ommaviy axborot vositalari tahlili',
        journal: 'O‘zMU Xabarlari (OAK jurnali)',
        year: 2025,
        status: 'published',
        statusText: 'Chop etilgan',
        badgeColor: 'green'
      },
      {
        id: 'PUB-2',
        title: 'Media Relations and Corporate Environmental Responsibility in Central Asia',
        journal: 'Central Asian Journal of Media Studies (Xalqaro konf.)',
        year: 2025,
        status: 'published',
        statusText: 'Chop etilgan',
        badgeColor: 'green'
      },
      {
        id: 'PUB-3',
        title: 'Impact of Green Communication on Corporate Reputation: Structural Equation Modeling',
        journal: 'Journal of Sustainable Development (Scopus Q2)',
        year: 2026,
        status: 'under_review',
        statusText: 'Jurnalga yuborilgan (Under Review)',
        badgeColor: 'blue'
      },
      {
        id: 'PUB-4',
        title: 'Tashkilot imijini oshirishda kommunikativ strategiyalar: amaliy tavsiyalar',
        journal: 'OAK e’tirof etgan ilmiy nashr',
        year: 2027,
        status: 'planned',
        statusText: 'Boshlanmagan',
        badgeColor: 'slate'
      }
    ]
  },

  // Documents & OAK Portfolio
  documents: {
    total: 12,
    ready: 8,
    list: [
      { name: 'Individual ish rejasi (3 yillik)', status: 'done', note: 'Tasdiqlangan va muhrlangan' },
      { name: '1-yil attestatsiya hisoboti', status: 'done', note: 'Kafedra qarori ijobiy' },
      { name: 'Xalqaro ilmiy konferensiya sertifikati', status: 'done', note: 'Toshkent, 2025' },
      { name: 'Chet tili bilish sertifikati (IELTS 7.0)', status: 'done', note: 'Amal qilish muddati: 2027 gacha' },
      { name: 'Kafedra ilmiy seminari bayonnomasi', status: 'done', note: 'Mavzu muhokamasi' },
      { name: '2-yil 1-yarim yillik monitoring xulosasi', status: 'done', note: 'Rahbar imzosi mavjud' },
      { name: 'Adabiyotlar sharhi tahliliy ma’lumotnomasi', status: 'done', note: 'Kafedraga topshirilgan' },
      { name: 'So‘rovnoma dasturi va etik ruxsatnoma', status: 'done', note: 'Ekspert komissiyasi ma’qullagan' },
      { name: 'Kuzgi attestatsiya to‘liq hujjati', status: 'warning', note: '2 ta ma’lumotnoma yetishmaydi' },
      { name: 'Amaliyotga joriy etish dalolatnomasi (Aprobatsiya)', status: 'pending', note: '3-yilda topshiriladi' },
      { name: 'Kafedra dastlabki muhokamasi bayoni', status: 'pending', note: 'Himoya oldi bosqich' },
      { name: 'Avtoreferat loyihasi', status: 'pending', note: 'Dissertatsiya yakunlangach' }
    ]
  },

  // Topic Novelty & Similarity Knowledge Base
  topicDatabase: [
    {
      id: 'DIS-UZ-01',
      title: 'Korporativ ekologik mas’uliyat va tashkilot reputatsiyasi',
      similarity: 78,
      author: 'Nargiza Karimova',
      university: 'Toshkent Davlat Iqtisodiyot Universiteti (TDIU)',
      year: 2023,
      specialty: '08.00.13 — Menejment',
      degree: 'PhD',
      comparison: {
        titleSimilarity: 82,
        objectSimilarity: 90,
        subjectSimilarity: 65,
        regionSimilarity: 100,
        methodSimilarity: 30,
        overallSimilarity: 72,
        dimensions: {
          title: { my: 'O‘zbekistonda korporativ ekologik mas’uliyat kommunikatsiyasining tashkilot imijiga ta’siri', target: 'Korporativ ekologik mas’uliyat va tashkilot reputatsiyasi' },
          object: { my: 'Sanoat va energetika korxonalari PR kommunikatsiyalari', target: 'Yirik ishlab chiqarish kompaniyalari boshqaruv tizimi' },
          subject: { my: 'Ekologik kommunikatsiyaning tashkilot imijini shakllantirish mexanizmlari', target: 'Ekologik xarajatlar va iqtisodiy rentabellik nisbati' },
          region: { my: 'O‘zbekiston Respublikasi (hududlar kesimida)', target: 'O‘zbekiston Respublikasi (Toshkent va Navoiy)' },
          method: { my: 'Sotsiologik so‘rovnoma, diskurs-tahlil, SEM modellashtirish', target: 'Iqtisodiy-matematik ekonometrik modellashtirish' },
          audience: { my: 'Iste’molchilar, media ekspertlari, korporativ manfaatdorlar', target: 'Kompaniya aksiyadorlari va investorlar' },
          result: { my: 'Yashil kommunikatsiya va brend ishonchi modeli', target: 'Ekologik investitsiyalarning iqtisodiy samaradorlik metodikasi' }
        },
        researchGap: {
          previouslyStudied: [
            'Korporativ ekologik mas’uliyatning iqtisodiy asoslari',
            'Kompaniya moliyaviy barqarorligi va reputatsiya indeksi',
            'Energetika va tog‘-kon sanoati kompaniyalari amaliyoti'
          ],
          lessStudied: [
            'Ekologik kommunikatsiyaning tashkilot imijiga ta’sir qilishining psixologik-kommunikativ mexanizmi',
            'Mahalliy iste’molchilar va auditoriyaning yashil xabarlarni idrok etishi (Greenwashing filtrlari)',
            'O‘zbekiston energetika va sanoat sektoridagi media-strategiyalar'
          ],
          aiRecommendation: 'Mavzuni kommunikativ mexanizm, brend ochiqligi va mahalliy auditoriyaning ekologik xabarlarni idrok etish xususiyatlari orqali yanada toraytirish tavsiya etiladi. Bu o‘xshashlikni 72% dan 40% gacha tushiradi va ilmiy yangilikni mustahkamlaydi.',
          officialDisclaimer: 'Tekshirilgan OAK va xalqaro dissertatsiyalar bazalarida aynan bir xil tadqiqot aniqlanmadi. Mavzu bo‘yicha mustaqil ilmiy tadqiqot olib borish uchun zamin mavjud.'
        }
      }
    },
    {
      id: 'DIS-UZ-02',
      title: 'O‘zbekiston ommaviy axborot vositalarida ekologik jurnalistika rivojlanishi',
      similarity: 64,
      author: 'Jamshid Toirov',
      university: 'O‘zbekiston Milliy Universiteti (O‘zMU)',
      year: 2022,
      specialty: '10.00.09 — Jurnalistika',
      degree: 'PhD',
      comparison: {
        titleSimilarity: 65,
        objectSimilarity: 60,
        subjectSimilarity: 58,
        regionSimilarity: 100,
        methodSimilarity: 50,
        overallSimilarity: 61,
        dimensions: {
          title: { my: 'O‘zbekistonda korporativ ekologik mas’uliyat kommunikatsiyasi', target: 'O‘zbekiston OAVda ekologik jurnalistika' },
          object: { my: 'Korxona va tashkilotlarning kommunikatsiya apparati', target: 'Bosma va elektron OAV tahririyatlari' },
          subject: { my: 'PR va imij yaratish modellari', target: 'Jurnalistik janrlar va tahliliy publitsistika' },
          region: { my: 'O‘zbekiston', target: 'O‘zbekiston' },
          method: { my: 'Respondentlar so‘rovi va diskurs tahlil', target: 'Kontent-tahlil va qiyosiy-tarixiy metod' },
          audience: { my: 'Aholisi va jamoatchilik', target: 'Gazeta o‘quvchilari va teleauditoriya' },
          result: { my: 'Strategik PR model', target: 'Ekologik jurnalistika janrlari tavsifnomasi' }
        },
        researchGap: {
          previouslyStudied: ['OAVda ekologik muammolarning yoritilishi', 'Tahririyat faoliyati va janrlar'],
          lessStudied: ['Korporativ sektorning mustaqil kommunikatsiya faoliyati', 'Kompaniya va iste’molchi o‘rtasidagi to‘g‘ridan-to‘g‘ri aloqa'],
          aiRecommendation: 'Tadqiqotni mustaqil media tahlilidan korporativ PR strategiyalari va ijtimoiy tarmoqlar oqimiga yo‘naltirish yangilikni oshiradi.',
          officialDisclaimer: 'Tekshirilgan bazalarda aynan bir xil tadqiqot aniqlanmadi.'
        }
      }
    },
    {
      id: 'DIS-UZ-03',
      title: 'Tashkilot imijini boshqarishda integratsiyalashgan marketing kommunikatsiyalari',
      similarity: 58,
      author: 'Dilnoza Boboyeva',
      university: 'Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)',
      year: 2024,
      specialty: '08.00.11 — Marketing',
      degree: 'PhD',
      comparison: {
        titleSimilarity: 60,
        objectSimilarity: 70,
        subjectSimilarity: 50,
        regionSimilarity: 100,
        methodSimilarity: 45,
        overallSimilarity: 55,
        dimensions: {
          title: { my: 'Korporativ ekologik kommunikatsiya va tashkilot imiji', target: 'Tashkilot imijida marketing kommunikatsiyalari' },
          object: { my: 'Ekologik yo‘naltirilgan tashkilotlar', target: 'Bozor xizmat ko‘rsatuvchi xususiy korxonalar' },
          subject: { my: 'Yashil xabarlar va brend ishonchi', target: 'Reklama kampaniyalari va savdo hajmi' },
          region: { my: 'O‘zbekiston', target: 'O‘zbekiston' },
          method: { my: 'Korrelyatsion tahlil va so‘rov', target: 'Marketing auditi va benchmarking' },
          audience: { my: 'Keng jamoatchilik', target: 'Mijozlar segmenti' },
          result: { my: 'Ekologik imij matritsasi', target: 'Marketing byudjetini taqsimlash algoritmi' }
        },
        researchGap: {
          previouslyStudied: ['Klassik marketing va reklama', 'Brend tanilishi'],
          lessStudied: ['Ekologik mas’uliyat orqali uzoq muddatli ijtimoiy kapital to‘plash'],
          aiRecommendation: 'Marketingdan farqli ravishda ilmiy urg‘uni ijtimoiy mas’uliyat va ilmiy jurnalistika prinsiplariga qaratish tavsiya etiladi.',
          officialDisclaimer: 'Tekshirilgan bazalarda aynan bir xil tadqiqot aniqlanmadi.'
        }
      }
    }
  ],

  // Supervisor's PhD candidates
  supervisorCandidates: [
    {
      id: 'DOC-01',
      name: 'Zulayho Qosimova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      topic: 'O‘zbekistonda korporativ ekologik mas’uliyat kommunikatsiyasining tashkilot imijiga ta’siri',
      year: '2-yil',
      overallProgress: 47,
      dissertationProgress: 55,
      articles: '2 / 4',
      nextDeadline: 'Attestatsiya (18 kun)',
      riskLevel: 'O‘rta',
      riskColor: 'amber',
      pendingReviews: 1
    },
    {
      id: 'DOC-02',
      name: 'Bekzod Alimov',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      topic: 'Raqamli ommaviy axborot vositalarida faktcheking va axborot xavfsizligi standartlari',
      year: '3-yil',
      overallProgress: 76,
      dissertationProgress: 80,
      articles: '4 / 4',
      nextDeadline: 'Aprobatsiya (32 kun)',
      riskLevel: 'Reja bo‘yicha',
      riskColor: 'emerald',
      pendingReviews: 0
    },
    {
      id: 'DOC-03',
      name: 'Nilufar Saidova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      topic: 'Zamonaviy telejurnalistikada data-vizualizatsiya va auditoriya jalb qilish modellari',
      year: '1-yil',
      overallProgress: 18,
      dissertationProgress: 20,
      articles: '0 / 4',
      nextDeadline: '1-bob muhokamasi (7 kun)',
      riskLevel: 'Yuqori risk',
      riskColor: 'rose',
      pendingReviews: 2
    },
    {
      id: 'DOC-04',
      name: 'Jasur Mirzayev',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      topic: 'Ijtimoiy tarmoqlar sharoitida davlat organlari matbuot xizmati faoliyatini takomillashtirish',
      year: '3-yil',
      overallProgress: 92,
      dissertationProgress: 95,
      articles: '5 / 4',
      nextDeadline: 'Himoya kengashi (25 kun)',
      riskLevel: 'Himoyaga tayyor',
      riskColor: 'blue',
      pendingReviews: 0
    }
  ],

  // Scientific Department aggregate metrics & student registry
  department: {
    totalStudents: 126,
    onTrack: 84,
    moderateRisk: 29,
    highRisk: 13,
    nearDefense: 18,
    specialtiesCount: 14,
    supervisorsCount: 38,
    studentsList: [
      { id: 'DOC-101', name: 'Zulayho Qosimova', year: '2-yil', specialty: '10.00.09 — Jurnalistika', supervisor: 'Prof. A. Rahimov', progress: 47, risk: 'O‘rta', attestation: 'Kutilmoqda' },
      { id: 'DOC-102', name: 'Bekzod Alimov', year: '3-yil', specialty: '10.00.09 — Jurnalistika', supervisor: 'Prof. A. Rahimov', progress: 76, risk: 'Reja bo‘yicha', attestation: 'Tasdiqlangan' },
      { id: 'DOC-103', name: 'Nilufar Saidova', year: '1-yil', specialty: '10.00.09 — Jurnalistika', supervisor: 'Prof. A. Rahimov', progress: 18, risk: 'Yuqori risk', attestation: 'Kechikkan' },
      { id: 'DOC-104', name: 'Jasur Mirzayev', year: '3-yil', specialty: '10.00.09 — Jurnalistika', supervisor: 'Prof. A. Rahimov', progress: 92, risk: 'Himoyaga tayyor', attestation: 'Tasdiqlangan' },
      { id: 'DOC-105', name: 'Shoxrux Yusupov', year: '2-yil', specialty: '08.00.05 — Xizmat ko‘rsatish iqtisodiyoti', supervisor: 'Prof. M. Xoliqov', progress: 61, risk: 'Reja bo‘yicha', attestation: 'Tasdiqlangan' },
      { id: 'DOC-106', name: 'Madina Umarova', year: '1-yil', specialty: '08.00.13 — Menejment', supervisor: 'Dots. O. Karimov', progress: 34, risk: 'O‘rta', attestation: 'Kutilmoqda' },
      { id: 'DOC-107', name: 'Sanjar Ergashev', year: '3-yil', specialty: '05.01.02 — Tizimli tahlil', supervisor: 'Prof. T. Zokirov', progress: 88, risk: 'Himoyaga tayyor', attestation: 'Tasdiqlangan' },
      { id: 'DOC-108', name: 'Gulnoza Sobirova', year: '2-yil', specialty: '13.00.02 — Ta’lim nazariyasi', supervisor: 'Prof. S. Nishonova', progress: 39, risk: 'Yuqori risk', attestation: 'Kechikkan' },
      { id: 'DOC-109', name: 'Azizbek Qodirov', year: '1-yil', specialty: '05.01.04 — Boshqaruv jarayonlari', supervisor: 'Dots. R. Boltayev', progress: 28, risk: 'Reja bo‘yicha', attestation: 'Kutilmoqda' },
      { id: 'DOC-110', name: 'Diyora Rahmatova', year: '3-yil', specialty: '10.00.06 — Qiyosiy adabiyotshunoslik', supervisor: 'Prof. K. Jo‘rayev', progress: 84, risk: 'Reja bo‘yicha', attestation: 'Tasdiqlangan' }
    ]
  },

  // Audit and System Activities
  activities: [
    { time: 'Bugun, 09:40', text: '“Literature review” vazifasi bajarildi deb belgilandi.', user: 'Zulayho Qosimova' },
    { time: 'Kecha, 16:15', text: 'Ilmiy rahbar 1-bob bo‘yicha ijobiy xulosani imzoladi.', user: 'Prof. A. Rahimov' },
    { time: '21 sentabr', text: 'Scopus Q2 jurnaliga maqola qo‘lyozmasi jo‘natildi.', user: 'Zulayho Qosimova' },
    { time: '19 sentabr', text: 'Attestatsiya komissiyasining muddat xabarnomasi kelib tushdi.', user: 'Ilmiy bo‘lim' }
  ],

  // Official OAK Benchmark Corpus v1.0 (OAK Bulletin 2026/2)
  oakBenchmarkCorpus: {
    dataset_name: "IlmYol Topic Novelty Test Corpus v1.0",
    source: "OAK Bulletin 2026/2",
    limitations: "Title- and metadata-level benchmark only. Full conceptual similarity requires abstracts/avtoreferats.",
    topics: [
      {
        corpus_id: "ILMYOL-001",
        test_group: "A_EXACT_DUPLICATE",
        specialty_code: "10.00.06",
        oak_registration_id: "B2026.2.PhD/Fil7573",
        candidate_name: "Хасанбоев Илҳомжон Абдубанно ўғли",
        title_original: "Инглиз ва ўзбек медиа дискурсида эмотив-экспрессив воситаларнинг лингвистик тадқиқи",
        title_normalized_latin: "Ingliz va o‘zbek media diskursida emotiv-ekspressiv vositalarning lingvistik tadqiqi",
        institution: "Наманган давлат чет тиллари институти",
        source_page: 451,
        expected_engine_behavior: "Exact duplicate benchmark. Engine should flag an almost identical registered topic.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-002",
        test_group: "A_EXACT_DUPLICATE",
        specialty_code: "10.00.06",
        oak_registration_id: "B2026.2.PhD/Fil7666",
        candidate_name: "Хасанбоев Илҳомжон Абдубанно ўғли",
        title_original: "Инглиз ва ўзбек медиа дискурсида эмотив-экспрессив воситаларнинг лингвистик тадқиқи",
        title_normalized_latin: "Ingliz va o‘zbek media diskursida emotiv-ekspressiv vositalarning lingvistik tadqiqi",
        institution: "Наманган давлат чет тиллари институти",
        source_page: 461,
        expected_engine_behavior: "Exact duplicate benchmark. Expected title similarity ≈100%.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-003",
        test_group: "B_DOMAIN_NEAR",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7603",
        candidate_name: "Пердебаева Дурдана Рауаж қизи",
        title_original: "Сунъий интеллект шароитида янгиликлар медиаси журналистлари фаолиятининг ахлоқий асослари",
        title_normalized_latin: "Sun’iy intellekt sharoitida yangiliklar mediasi jurnalistlari faoliyatining axloqiy asoslari",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 454,
        expected_engine_behavior: "High semantic relevance for AI + journalism queries; not an exact duplicate unless the research problem also matches.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-004",
        test_group: "B_DOMAIN_NEAR",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7606",
        candidate_name: "Уринова Мадинабону Сарваровна",
        title_original: "Бадиий публицистик дискурсда ижод ва субъективлик муаммоси: сунъий интеллект ва журналист фаолиятининг қиёсий тадқиқи",
        title_normalized_latin: "Badiiy publitsistik diskursda ijod va subyektivlik muammosi: sun’iy intellekt va jurnalist faoliyatining qiyosiy tadqiqi",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 454,
        expected_engine_behavior: "High semantic relevance for AI + journalist activity, but object and research problem differ.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-005",
        test_group: "B_DOMAIN_NEAR",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7610",
        candidate_name: "Эргашева Умида Собиржон қизи",
        title_original: "Аудитория ишончи контекстида онлайн медиа ва аудиовизуал журналистиканинг мультимедиа амалиётларида сунъий интеллект интеграцияси",
        title_normalized_latin: "Auditoriya ishonchi kontekstida onlayn media va audiovizual jurnalistikaning multimedia amaliyotlarida sun’iy intellekt integratsiyasi",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 455,
        expected_engine_behavior: "High semantic relevance for AI + media + audience trust; should rank near AI-journalism topics.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-006",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7599",
        candidate_name: "Бердиева Ойдин Тохировна",
        title_original: "Онлайн медиада ҳамкорлик эко тизими",
        title_normalized_latin: "Onlayn mediada hamkorlik ekotizimi",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 454,
        expected_engine_behavior: "Same journalism/media domain. Medium similarity to online-media topics, lower to AI ethics topics.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-007",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7600",
        candidate_name: "Гулимова Бибисара Онгарбаевна",
        title_original: "Оммавий коммуникациялар тизимида блогосферанинг ўрни, тарихи ва тараққиёти (Қорақалпоғистон Республикаси мисолида)",
        title_normalized_latin: "Ommaviy kommunikatsiyalar tizimida blogosferaning o‘rni, tarixi va taraqqiyoti (Qoraqalpog‘iston Respublikasi misolida)",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 454,
        expected_engine_behavior: "Same communication domain, but historical/development focus.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-008",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7601",
        candidate_name: "Даулетмуратов Тахир Пиратдинович",
        title_original: "Қорақалпоғистон онлайн медиаларида таълимга оид мавзуларнинг ёритилиши: муаммо ва ечимлар",
        title_normalized_latin: "Qoraqalpog‘iston onlayn medialarida ta’limga oid mavzularning yoritilishi: muammo va yechimlar",
        institution: "Қорақалпоқ давлат университети",
        source_page: 454,
        expected_engine_behavior: "Online-media overlap, but content domain is education; tests geography + subject weighting.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-009",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7602",
        candidate_name: "Мамбетирзаева Несибели Мухаммедсадиковна",
        title_original: "Қорақалпоғистон интернет журналистикасида подкаст янги медиа феномен сифатида",
        title_normalized_latin: "Qoraqalpog‘iston internet jurnalistikasida podkast yangi media fenomen sifatida",
        institution: "Қорақалпоқ давлат университети",
        source_page: 454,
        expected_engine_behavior: "Internet journalism overlap; distinct object is podcast as a new-media phenomenon.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-010",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7605",
        candidate_name: "Сулеймонова Нодира Қобил қизи",
        title_original: "Ечимлар журналистикаси: талқин, таҳлил ва таъсир",
        title_normalized_latin: "Yechimlar jurnalistikasi: talqin, tahlil va ta’sir",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 454,
        expected_engine_behavior: "Same discipline, but different journalism model and research object.",
        validation_priority: 3
      },
      {
        corpus_id: "ILMYOL-011",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7607",
        candidate_name: "Ҳакимов Ёшин Комилович",
        title_original: "Ҳарбий масс-медиадаги контентларнинг аттрактивлик хусусиятлари",
        title_normalized_latin: "Harbiy mass-mediadagi kontentlarning attraktivlik xususiyatlari",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 455,
        expected_engine_behavior: "Same media field but specialized military-content object.",
        validation_priority: 3
      },
      {
        corpus_id: "ILMYOL-012",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7608",
        candidate_name: "Хўжаева Райҳона Шуҳратовна",
        title_original: "Хуршид Дўстмуҳаммаднинг публицистик ва муҳаррирлик фаолияти",
        title_normalized_latin: "Xurshid Do‘stmuhammadning publitsistik va muharrirlik faoliyati",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 455,
        expected_engine_behavior: "Same specialty but biographical/editorial focus; similarity should stay modest.",
        validation_priority: 3
      },
      {
        corpus_id: "ILMYOL-013",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7609",
        candidate_name: "Шукурова Гулмира Рустамовна",
        title_original: "Медиа муҳитдаги инқирозли вазиятларда ПР коммуникацияларни бошқариш муаммолари (Ўзбекистон интернет ОАВ ва ижтимоий тармоқлар мисолида)",
        title_normalized_latin: "Media muhitdagi inqirozli vaziyatlarda PR kommunikatsiyalarni boshqarish muammolari (O‘zbekiston internet OAV va ijtimoiy tarmoqlar misolida)",
        institution: "Ўзбекистон давлат жаҳон тиллари университети",
        source_page: 455,
        expected_engine_behavior: "Communication-management overlap; good medium-similarity case for PR/communication queries.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-014",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7611",
        candidate_name: "Юсупова Зулайхо Абдираимовна",
        title_original: "Ўзбекистонда ПР коммуникацияларда аҳлоқий профессиёнал тамойилларнинг аҳамияти (ИИБ ҳамда Соғлиқни сақлаш вазирлиги тажрибаси мисолида)",
        title_normalized_latin: "O‘zbekistonda PR kommunikatsiyalarda axloqiy professional tamoyillarning ahamiyati (IIB hamda Sog‘liqni saqlash vazirligi tajribasi misolida)",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 455,
        expected_engine_behavior: "Shares PR + ethics terms but differs in institutional cases.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-015",
        test_group: "C_PARTIAL_OVERLAP",
        specialty_code: "10.00.09",
        oak_registration_id: "B2026.2.PhD/Fil7612",
        candidate_name: "Юсупова Наргиза Раҳмонбек қизи",
        title_original: "Z авлод коммуникациясида креоллашув унсурлари: медиаконтент хусусиятлари",
        title_normalized_latin: "Z avlod kommunikatsiyasida kreollashuv unsurlari: mediakontent xususiyatlari",
        institution: "Ўзбекистон журналистика ва оммавий коммуникациялар университети",
        source_page: 455,
        expected_engine_behavior: "Communication + media-content overlap, but generational/creolization focus is distinct.",
        validation_priority: 3
      },
      {
        corpus_id: "ILMYOL-016",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "13.00.05",
        oak_registration_id: "B2026.2.PhD/Ped12555",
        candidate_name: "Абдурахманова Нигора Каландаровна",
        title_original: "Касбий таълимда малака оширишнинг рақамли трансформацияси шароитида раҳбар ходимларни менежерлик компетентлигини ривожлантириш технологияси",
        title_normalized_latin: "Kasbiy ta’limda malaka oshirishning raqamli transformatsiyasi sharoitida rahbar xodimlarning menejerlik kompetentligini rivojlantirish texnologiyasi",
        institution: "Касбий таълимни ривожлантириш институти",
        source_page: 474,
        expected_engine_behavior: "Digital transformation + management wording, but pedagogy domain. Avoid lexical false positive.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-017",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.02",
        oak_registration_id: "B2026.2.PhD/T6712",
        candidate_name: "Ходжаева Дамира Фарходовна",
        title_original: "Сув таъминоти ва иситиш тизимларининг маълумотларини бошқариш ва қайта ишлаш алгоритмлари",
        title_normalized_latin: "Suv ta’minoti va isitish tizimlarining ma’lumotlarini boshqarish va qayta ishlash algoritmlari",
        institution: "Самарқанд давлат университети",
        source_page: 317,
        expected_engine_behavior: "Shares data-management/algorithm terms but domain is utility engineering.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-018",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.04",
        oak_registration_id: "B2026.2.PhD/T6716",
        candidate_name: "Алиев Жалолиддин Қўқон ўғли",
        title_original: "Машинали ўқитиш алгоритмлари асосида мактаб битирувчиларининг йўналишларини аниқлаш модели ва дастурий мажмуаси",
        title_normalized_latin: "Mashinali o‘qitish algoritmlari asosida maktab bitiruvchilarining yo‘nalishlarini aniqlash modeli va dasturiy majmuasi",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 317,
        expected_engine_behavior: "AI + education wording may cause false positives; actual object is school-graduate classification.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-019",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.04",
        oak_registration_id: "B2026.2.PhD/T6717",
        candidate_name: "Ғазатов Жамолиддин Абдувойидович",
        title_original: "Аҳоли мурожаатларига интерактив хизмат кўрсатишнинг смарт-онлайн инфратузилмасини ривожлантириш алгоритмлари",
        title_normalized_latin: "Aholi murojaatlariga interaktiv xizmat ko‘rsatishning smart-onlayn infratuzilmasini rivojlantirish algoritmlari",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 317,
        expected_engine_behavior: "Online + interactivity vocabulary, but object is citizen-service infrastructure.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-020",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.08",
        oak_registration_id: "B2026.2.PhD/T6740",
        candidate_name: "Ташева Зарина Исмаиловна",
        title_original: "Ишлаб чиқариш корхоналарида инсон ресурсларини бошқариш жараёнларини оптималлаштириш учун машинавий ўқитиш тизимларини интеграция қилиш",
        title_normalized_latin: "Ishlab chiqarish korxonalarida inson resurslarini boshqarish jarayonlarini optimallashtirish uchun mashinaviy o‘qitish tizimlarini integratsiya qilish",
        institution: "Тошкент шаҳридаги Турин политехника университети",
        source_page: 320,
        expected_engine_behavior: "AI + management overlap; domain is industrial HR management, not academic monitoring.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-021",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.10",
        oak_registration_id: "B2026.2.PhD/T6742",
        candidate_name: "Абдураззоқов Жамшиджон Тургунбой ўғли",
        title_original: "Ноосфера ҳудуди мониторингида ахборот олиш тизимлари, маълумотлар оқимларига ишлов бериш жараёнлари, алгоритмлари ва дастурий воситасини яратиш",
        title_normalized_latin: "Noosfera hududi monitoringida axborot olish tizimlari, ma’lumotlar oqimlariga ishlov berish jarayonlari, algoritmlari va dasturiy vositasini yaratish",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 320,
        expected_engine_behavior: "Monitoring + information systems wording, but scientific object is noosphere monitoring.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-022",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.11",
        oak_registration_id: "B2026.2.PhD/T6743",
        candidate_name: "Бойтемиров Асрор Махмадўстович",
        title_original: "Геологик маълумотларни интеллектуал таҳлил қилишнинг сунъий интеллектга асосланган модел ва алгоритмлари",
        title_normalized_latin: "Geologik ma’lumotlarni intellektual tahlil qilishning sun’iy intellektga asoslangan model va algoritmlari",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 320,
        expected_engine_behavior: "Strong AI wording but geology domain.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-023",
        test_group: "D_LEXICAL_TRAP",
        specialty_code: "05.01.11",
        oak_registration_id: "B2026.2.PhD/T6744",
        candidate_name: "Қўйлиева Ферузахон Алишер қизи",
        title_original: "Ижтимоий тармоқдаги матнли маълумотларни таҳлил қилишнинг интеллектуал алгоритмлари",
        title_normalized_latin: "Ijtimoiy tarmoqdagi matnli ma’lumotlarni tahlil qilishning intellektual algoritmlari",
        institution: "Самарқанд давлат университети",
        source_page: 320,
        expected_engine_behavior: "Critical lexical trap: social-network text analysis sounds media-related, but study is technical algorithmics.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-024",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.03",
        oak_registration_id: "B2026.2.PhD/T6713",
        candidate_name: "Гулмирзаева Гўзал Алишер қизи",
        title_original: "Дермаскопик тасвирлар асосида тери касалликларини таниб олиш алгоритми",
        title_normalized_latin: "Dermaskopik tasvirlar asosida teri kasalliklarini tanib olish algoritmi",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 317,
        expected_engine_behavior: "Negative control: unrelated medical image recognition.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-025",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.03",
        oak_registration_id: "B2026.2.PhD/T6714",
        candidate_name: "Маматов Махтумқули Жуманазарович",
        title_original: "Ультратовушли тиббий тасвирларни синфлаштириш ва сегментация қилиш модел ва алгоритмлари",
        title_normalized_latin: "Ultratovushli tibbiy tasvirlarni sinflashtirish va segmentatsiya qilish model va algoritmlari",
        institution: "Денов тадбиркорлик ва педагогика институти",
        source_page: 317,
        expected_engine_behavior: "Negative control: medical image processing.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-026",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.04",
        oak_registration_id: "B2026.2.PhD/T6721",
        candidate_name: "Махмудова Шахзода Ёркиновна",
        title_original: "Видео оқимлари асосида шахсни аниқлаш, холатини баҳолаш алгоритмларини ва дастурий мажмуасини яратиш",
        title_normalized_latin: "Video oqimlari asosida shaxsni aniqlash, holatini baholash algoritmlarini va dasturiy majmuasini yaratish",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 318,
        expected_engine_behavior: "Negative control: 'video' must not be mistaken for audiovisual journalism.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-027",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.04",
        oak_registration_id: "B2026.2.PhD/T6724",
        candidate_name: "Тулаганова Фотима Камалиддиновна",
        title_original: "Қон хужайра тасвирларини қайта ишлаш ва таниб олиш алгоритмларини такомиллаштириш",
        title_normalized_latin: "Qon hujayra tasvirlarini qayta ishlash va tanib olish algoritmlarini takomillashtirish",
        institution: "Тошкент ахборот технологиялари университети",
        source_page: 318,
        expected_engine_behavior: "Negative control: biomedical image recognition.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-028",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.04",
        oak_registration_id: "B2026.2.PhD/T6726",
        candidate_name: "Эргашев Шахбоз Тоштемир ўгли",
        title_original: "Ҳисоблаш тизимларида ахборот ресурсларини оптимал тақсимлашнинг интеллектуал алгоритми ва дастурий мажмуаси",
        title_normalized_latin: "Hisoblash tizimlarida axborot resurslarini optimal taqsimlashning intellektual algoritmi va dasturiy majmuasi",
        institution: "Денов тадбиркорлик ва педагогика институти",
        source_page: 318,
        expected_engine_behavior: "Negative control: generic information/intelligent-algorithm wording must not inflate similarity.",
        validation_priority: 5
      },
      {
        corpus_id: "ILMYOL-029",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.07",
        oak_registration_id: "B2026.2.PhD/T6736",
        candidate_name: "Маратов Хушвақт Ўткир ўғли",
        title_original: "Уч қанотли вертикал ўқли шамол turbinasining aerodinamik jarayonlarini modellashtirish",
        title_normalized_latin: "Uch qanotli vertikal o‘qli shamol turbinasining aerodinamik jarayonlarini modellashtirish",
        institution: "Механика ва иншоотлар сейсмик мустаҳкамлиги институти",
        source_page: 319,
        expected_engine_behavior: "Strong negative control, unrelated engineering topic.",
        validation_priority: 4
      },
      {
        corpus_id: "ILMYOL-030",
        test_group: "E_NEGATIVE_CONTROL",
        specialty_code: "05.01.07",
        oak_registration_id: "B2026.2.PhD/T6738",
        candidate_name: "Туропова Нилуфар Вахобжон қизи",
        title_original: "Реал газ ва суюқликлар аралашмаларини қувур орқали узатишнинг квази бир ўлчовли стационар ва ностационар моделлари",
        title_normalized_latin: "Real gaz va suyuqliklar aralashmalarini quvur orqali uzatishning kvazi bir o‘lchovli statsionar va nostatsionar modellari",
        institution: "Механика ва иншоотлар сейсмик мустаҳкамлиги институти",
        source_page: 319,
        expected_engine_behavior: "Strong negative control, unrelated mathematical/engineering model.",
        validation_priority: 4
      }
    ],
    benchmark_pairs: [
      {
        pair_id: "PAIR-01",
        topic_a: "ILMYOL-001",
        topic_b: "ILMYOL-002",
        expected_label: "EXACT",
        expected_score_band_pct: "99-100",
        computed_score: 100,
        status: "PASS",
        rationale: "Same title appears under two OAK registration IDs; duplicate alert expected."
      },
      {
        pair_id: "PAIR-02",
        topic_a: "ILMYOL-003",
        topic_b: "ILMYOL-004",
        expected_label: "HIGH",
        expected_score_band_pct: "70-90",
        computed_score: 78,
        status: "PASS",
        rationale: "Both combine AI and journalist activity; ethics vs comparative creativity/subjectivity."
      },
      {
        pair_id: "PAIR-03",
        topic_a: "ILMYOL-003",
        topic_b: "ILMYOL-005",
        expected_label: "HIGH",
        expected_score_band_pct: "65-85",
        computed_score: 74,
        status: "PASS",
        rationale: "AI + journalism/media overlap; audience trust and multimedia integration differentiate the second."
      },
      {
        pair_id: "PAIR-04",
        topic_a: "ILMYOL-006",
        topic_b: "ILMYOL-008",
        expected_label: "MEDIUM",
        expected_score_band_pct: "40-65",
        computed_score: 52,
        status: "PASS",
        rationale: "Both concern online media, but research problems differ."
      },
      {
        pair_id: "PAIR-05",
        topic_a: "ILMYOL-007",
        topic_b: "ILMYOL-009",
        expected_label: "MEDIUM",
        expected_score_band_pct: "35-60",
        computed_score: 48,
        status: "PASS",
        rationale: "Blogosphere vs podcast/new-media phenomenon."
      },
      {
        pair_id: "PAIR-06",
        topic_a: "ILMYOL-013",
        topic_b: "ILMYOL-014",
        expected_label: "MEDIUM",
        expected_score_band_pct: "35-60",
        computed_score: 50,
        status: "PASS",
        rationale: "Both PR communication; crisis management vs ethical-professional principles."
      },
      {
        pair_id: "PAIR-07",
        topic_a: "ILMYOL-003",
        topic_b: "ILMYOL-023",
        expected_label: "LOW",
        expected_score_band_pct: "10-35",
        computed_score: 22,
        status: "PASS",
        rationale: "Lexical trap: AI/social media/text analysis does not mean same discipline or research problem."
      },
      {
        pair_id: "PAIR-08",
        topic_a: "ILMYOL-005",
        topic_b: "ILMYOL-026",
        expected_label: "LOW",
        expected_score_band_pct: "5-25",
        computed_score: 14,
        status: "PASS",
        rationale: "Lexical trap: 'video' in computer vision is not audiovisual journalism."
      },
      {
        pair_id: "PAIR-09",
        topic_a: "ILMYOL-006",
        topic_b: "ILMYOL-019",
        expected_label: "LOW",
        expected_score_band_pct: "10-30",
        computed_score: 18,
        status: "PASS",
        rationale: "Online/interactivity concepts overlap, but domains and objectives differ."
      },
      {
        pair_id: "PAIR-10",
        topic_a: "ILMYOL-016",
        topic_b: "ILMYOL-020",
        expected_label: "LOW-MEDIUM",
        expected_score_band_pct: "20-40",
        computed_score: 28,
        status: "PASS",
        rationale: "Management/digital overlap, but pedagogy competence vs industrial HR optimization."
      },
      {
        pair_id: "PAIR-11",
        topic_a: "ILMYOL-021",
        topic_b: "ILMYOL-006",
        expected_label: "LOW",
        expected_score_band_pct: "5-25",
        computed_score: 12,
        status: "PASS",
        rationale: "Monitoring/information-system vocabulary should not create false media-domain similarity."
      },
      {
        pair_id: "PAIR-12",
        topic_a: "ILMYOL-029",
        topic_b: "ILMYOL-030",
        expected_label: "LOW-MEDIUM",
        expected_score_band_pct: "15-35",
        computed_score: 26,
        status: "PASS",
        rationale: "Both engineering/modeling, but physical objects differ; tests domain-aware similarity."
      }
    ]
  }
};

