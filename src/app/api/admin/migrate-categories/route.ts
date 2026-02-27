import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getCategoryColor } from '@/utils/categoryColor';

const CATEGORY_TRANSLATIONS: Record<string, string> = {
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
    "economics": "Kinh tế"
};

// Temporary map for icons based on keywords matching categoryColor.ts
function getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();

    if (cat.includes("lập trình") || cat.includes("công nghệ") || cat.includes("programming") || cat.includes("software") || cat.includes("code") || cat.includes("tech") || cat.includes("cpu"))
        return "Code";

    if (cat.includes("tiếng") || cat.includes("ngôn ngữ") || cat.includes("english") || cat.includes("language") || cat.includes("văn học") || cat.includes("literature") || cat.includes("book"))
        return "Languages";

    if (cat.includes("lịch sử") || cat.includes("history") || cat.includes("địa lý") || cat.includes("geography") || cat.includes("globe"))
        return "Globe";

    if (cat.includes("khoa học") || cat.includes("science") || cat.includes("vật lý") || cat.includes("hóa") || cat.includes("physics") || cat.includes("chemistry") || cat.includes("microscope"))
        return "Microscope";

    if (cat.includes("toán") || cat.includes("math") || cat.includes("thống kê") || cat.includes("statistics") || cat.includes("calculator"))
        return "Calculator";

    if (cat.includes("y tế") || cat.includes("sinh học") || cat.includes("biology") || cat.includes("health") || cat.includes("y học") || cat.includes("pulse"))
        return "HeartPulse";

    if (cat.includes("kinh") || cat.includes("business") || cat.includes("tài chính") || cat.includes("finance") || cat.includes("economics") || cat.includes("chart"))
        return "TrendingUp";

    if (cat.includes("âm nhạc") || cat.includes("music") || cat.includes("nghệ thuật") || cat.includes("art"))
        return "Music";

    return "Tag";
}

// Function to extract color keyword from categoryColor.ts output
function extractColorKeyword(colorClass: string): string {
    if (colorClass.includes('blue')) return 'blue';
    if (colorClass.includes('green')) return 'emerald'; // mapping green to emerald for better look? Or 'green'
    if (colorClass.includes('amber')) return 'amber';
    if (colorClass.includes('purple')) return 'purple';
    if (colorClass.includes('cyan')) return 'cyan';
    if (colorClass.includes('rose')) return 'rose';
    if (colorClass.includes('orange')) return 'orange';
    if (colorClass.includes('indigo')) return 'indigo';
    return 'slate';
}

function normalizeString(str: string): string {
    return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function generateSlug(name: string): string {
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

export async function POST() {
    try {
        const supabase = await createClient();

        // 1. Verify admin access using getUser() for security
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Added explicit email check using environment variable
        const adminEmail = process.env.ADMIN_EMAIL;
        if (profile?.role !== 'admin' || user.email !== adminEmail) {
            return NextResponse.json({
                error: 'Forbidden. Admin access required.',
                debug: user.email !== adminEmail ? 'Email mismatch' : 'Role not admin'
            }, { status: 403 });
        }

        // 2. Fetch all existing categories to build a lookup map
        const { data: allCategories, error: catError } = await supabase
            .from('categories')
            .select('*');

        if (catError) {
            return NextResponse.json({ error: `Failed to fetch categories: ${catError.message}` }, { status: 500 });
        }

        const categoryMap = new Map<string, any>();
        allCategories?.forEach(cat => {
            categoryMap.set(cat.slug, cat);
        });

        // 3. Identify sets to migrate (including those stuck in 'Chưa phân loại' which have actual names)
        const fallbackCat = categoryMap.get(generateSlug('Chưa phân loại'));

        let query = supabase.from('flashcard_sets').select('id, category, category_id');

        if (fallbackCat?.id) {
            // Fetch if ID is NULL OR (ID is fallback AND text is not "Chưa phân loại")
            query = query.or(`category_id.is.null,and(category_id.eq.${fallbackCat.id},category.neq.Chưa phân loại)`);
        } else {
            query = query.is('category_id', null);
        }

        const { data: sets, error: fetchError } = await query;

        if (fetchError) {
            return NextResponse.json({ error: `Failed to fetch flashcard sets: ${fetchError.message}` }, { status: 500 });
        }

        if (!sets || sets.length === 0) {
            return NextResponse.json({ message: 'No sets require migration (all are already categorized).' });
        }

        // 4. Identify missing categories and deduplicate by slug AND normalized name in memory
        const missingCategoriesBySlug = new Map<string, string>(); // slug -> normalizedName
        const normalizedToRaw = new Map<string, string>(); // normalizedName -> rawName

        sets.forEach((set) => {
            if (set.category && set.category.trim() !== '') {
                const rawCat = set.category.trim();
                const normalizedCat = normalizeString(rawCat);
                const translatedCat = CATEGORY_TRANSLATIONS[normalizedCat] || rawCat;
                const slug = generateSlug(translatedCat);

                // Only add to insertion list if it doesn't exist in DB OR isn't already in our maps
                if (!categoryMap.has(slug) && !missingCategoriesBySlug.has(slug)) {
                    missingCategoriesBySlug.set(slug, translatedCat);
                    normalizedToRaw.set(translatedCat, rawCat);
                }
            }
        });

        let newCategoriesInserted = 0;
        if (missingCategoriesBySlug.size > 0) {
            const categoriesToInsert = [];

            for (const [slug, translatedName] of Array.from(missingCategoriesBySlug.entries())) {
                // Determine final properties
                let finalName = translatedName;
                let icon = getCategoryIcon(translatedName);
                let colorClass = getCategoryColor(translatedName);
                let colorKeyword = extractColorKeyword(colorClass);

                // Special explicit mapping requested by user
                if (slug === 'khac' || slug === 'chua-phan-loai') {
                    finalName = 'Chưa phân loại';
                    icon = 'Tag';
                    colorKeyword = 'slate';
                }

                if (colorClass.includes('green')) colorKeyword = 'green';

                const finalSlug = generateSlug(finalName);

                categoriesToInsert.push({
                    name: finalName,
                    slug: finalSlug,
                    icon: icon,
                    color: colorKeyword
                });
            }

            // Perform UPSERT in batches if needed, though usually categories are few
            if (categoriesToInsert.length > 0) {
                // Deduplicate once more before insert to prevent ON CONFLICT within the same batch
                const finalUniqueToInsert = Array.from(
                    new Map(categoriesToInsert.map(item => [item.slug, item])).values()
                );

                const { data: insertedCategories, error: insertError } = await supabase
                    .from('categories')
                    .upsert(finalUniqueToInsert, { onConflict: 'slug' })
                    .select();

                if (insertError) {
                    return NextResponse.json({
                        error: `Upsert conflict: ${insertError.message}`,
                        details: insertError.details
                    }, { status: 400 });
                }

                insertedCategories?.forEach(cat => {
                    categoryMap.set(cat.slug, cat);
                });
                newCategoriesInserted = insertedCategories?.length || 0;
            }
        }

        // 5. Update flashcard_sets with category_id (Autonomous & Robust)
        let updatedCount = 0;
        let fixedNamesCount = 0;
        // We process in batches of 50 as requested
        const BATCH_SIZE = 50;
        for (let i = 0; i < sets.length; i += BATCH_SIZE) {
            const batch = sets.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(batch.map(async (set) => {
                let assignedId = null;
                let standardName = null;

                if (set.category && set.category.trim() !== '') {
                    const rawCat = set.category.trim();
                    const normalizedCat = normalizeString(rawCat);
                    const translatedCat = CATEGORY_TRANSLATIONS[normalizedCat] || rawCat;
                    const slug = generateSlug(translatedCat);

                    // Special mapping for 'Khác' -> 'Chưa phân loại'
                    if (slug === 'khac') {
                        assignedId = fallbackCat?.id || null;
                        standardName = 'Chưa phân loại';
                    } else {
                        const matchedCat = categoryMap.get(slug);
                        if (matchedCat) {
                            assignedId = matchedCat.id;
                            standardName = matchedCat.name;
                        }
                    }
                } else {
                    assignedId = fallbackCat?.id || null;
                    standardName = 'Chưa phân loại';
                }

                if (assignedId) {
                    const updatePayload: any = { category_id: assignedId };

                    // SCENARIO 2: Auto-fix minor deviations
                    // If the text in 'category' column is different from the DB standard name, fix it!
                    let nameWasFixed = false;
                    if (standardName && set.category !== standardName) {
                        updatePayload.category = standardName;
                        nameWasFixed = true;
                    }

                    const { error: updateError } = await supabase
                        .from('flashcard_sets')
                        .update(updatePayload)
                        .eq('id', set.id);

                    if (updateError) throw updateError;
                    return { fixed: nameWasFixed };
                }
                return { fixed: false };
            }));

            // Count successes
            results.forEach(res => {
                if (res.status === 'fulfilled') {
                    updatedCount++;
                    if (res.value.fixed) fixedNamesCount++;
                } else {
                    console.error("Batch update item failed:", res.reason);
                }
            });
        }

        return NextResponse.json({
            message: 'Autonomous synchronization completed',
            summary: `Đã xử lý ${sets.length} bản ghi. Đã sửa ${fixedNamesCount} lỗi tên, đã thêm ${newCategoriesInserted} danh mục mới.`,
            newCategoriesCount: newCategoriesInserted,
            fixedNamesCount: fixedNamesCount,
            setsUpdatedCount: updatedCount,
            totalSetsScanned: sets.length
        });

    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({
            error: error.message || "An unexpected error occurred during migration",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
