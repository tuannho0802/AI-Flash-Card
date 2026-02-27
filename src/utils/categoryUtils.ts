
/**
 * Utility functions for Category Management
 */

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
    "science": "Khoa học",
    "math": "Toán học",
    "mathematics": "Toán học",
    "literature": "Văn học",
    "history": "Lịch sử",
    "geography": "Địa lý",
    "programming": "Lập trình",
    "technology": "Công nghệ",
    "tech": "Công nghệ",
    "business": "Kinh doanh",
    "health": "Sức khỏe",
    "medicine": "Y tế",
    "language": "Ngôn ngữ",
    "languages": "Ngôn ngữ",
    "art": "Nghệ thuật",
    "music": "Âm nhạc",
    "biology": "Sinh học",
    "chemistry": "Hóa học",
    "physics": "Vật lý",
    "psychology": "Tâm lý học",
    "finance": "Tài chính",
    "economics": "Kinh tế",
    "english": "Tiếng Anh",
    "vietnamese": "Tiếng Việt",
    "politics": "Chính trị",
    "religion": "Tôn giáo",
    "sports": "Thể thao",
    "travel": "Du lịch",
    "cooking": "Nấu ăn",
    "fashion": "Thời trang"
};

/**
 * Maps a category name to the most suitable Lucide icon name.
 * Uses semantic keyword matching for both Vietnamese and English labels.
 * Prioritizes specific matches over generic ones.
 */
export function getBestIcon(categoryName: string): string {
    const cat = categoryName.toLowerCase();

    // 1. Science & Tech (Space, IT, Lab)
    if (cat.match(/vũ trụ|thiên văn|khám phá không gian|space|astronomy|rocket|tên lửa/)) return "Rocket";
    if (cat.match(/nguyên tử|năng lượng|cơ học lượng tử|atom|quantum|nuclear/)) return "Atom";
    if (cat.match(/thí nghiệm|hóa học|vật lý|lab|experiment|chemistry|physics|beaker/)) return "Beaker";
    if (cat.match(/khoa học|science|microscope|kính hiển vi/)) return "Microscope";
    if (cat.match(/lập trình|phần mềm|ai|trí tuệ nhân tạo|programming|software|coding|it|cpu|chip/)) return "Cpu";
    if (cat.match(/công nghệ|máy tính|tech|computer|javascript|python|react|web|database|server/)) return "Code";

    // 2. Business & Finance
    if (cat.match(/tài chính|tiền tệ|đầu tư|finance|currency|invest|money|banknote/)) return "Banknote";
    if (cat.match(/thị trường chứng khoán|tăng trưởng|stock market|growth|economics|trending/)) return "TrendingUp";
    if (cat.match(/kinh doanh|quản trị|công việc|sự nghiệp|business|management|career|job|briefcase/)) return "Briefcase";

    // 3. Health & Life Sciences
    if (cat.match(/bác sĩ|khám bệnh|bệnh viện|doctor|hospital|medical|clinic|stethoscope/)) return "Stethoscope";
    if (cat.match(/y tế|sức khỏe|y học|thể dục|health|medicine|pulse|heart/)) return "HeartPulse";
    if (cat.match(/thể thao|thể hình|gym|sport|fitness|workout|dumbbell/)) return "Dumbbell";
    if (cat.match(/ẩm thực|nấu ăn|ăn uống|cooking|food|recipes|kitchen|utensils/)) return "Utensils";

    // 4. Social & Arts
    if (cat.match(/văn học|đọc sách|thư viện|literature|reading|library|book/)) return "BookOpen";
    if (cat.match(/nghệ thuật|hội họa|thiết kế|sáng tạo|art|design|creative|painting|palette/)) return "Palette";
    if (cat.match(/âm nhạc|giải trí|nghệ thuật biểu diễn|music|entertainment|song|concert/)) return "Music";
    if (cat.match(/địa lý|du lịch|văn hóa|geography|travel|culture|globe|bản đồ|map/)) return "Globe";
    if (cat.match(/lịch sử|chính trị|kiến trúc|cổ đại|history|politics|ancient|monument|landmark/)) return "Landmark";

    // 5. Skills & Intelligence
    if (cat.match(/ý tưởng|mẹo vặt|sáng kiến|idea|tips|innovation|lightbulb|bóng đèn/)) return "Lightbulb";
    if (cat.match(/dịch thuật|ngoại ngữ|english|languages|translation|nhôn ngữ/)) return "Languages";
    if (cat.match(/tâm lý|tư duy|trí tuệ|psychology|intelligence|brain|não/)) return "Brain";
    if (cat.match(/giáo dục|education|học|study|school|trường|graduation/)) return "GraduationCap";

    // 6. Math & Numbers
    if (cat.match(/toán|math|thống kê|statistics|calculator|hình học|geometry/)) return "Calculator";

    // Generic fallback
    return "LayoutGrid";
}

export function normalizeString(str: string): string {
    return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}
