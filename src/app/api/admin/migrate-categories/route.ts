import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getCategoryColor } from '@/utils/categoryColor';

// Temporary map for icons based on keywords matching categoryColor.ts
function getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();

    if (cat.includes("lập trình") || cat.includes("công nghệ") || cat.includes("programming") || cat.includes("software") || cat.includes("code") || cat.includes("tech"))
        return "Code";

    if (cat.includes("tiếng") || cat.includes("ngôn ngữ") || cat.includes("english") || cat.includes("language") || cat.includes("văn học") || cat.includes("literature"))
        return "Languages";

    if (cat.includes("lịch sử") || cat.includes("history") || cat.includes("địa lý") || cat.includes("geography"))
        return "Globe";

    if (cat.includes("khoa học") || cat.includes("science") || cat.includes("vật lý") || cat.includes("hóa") || cat.includes("physics") || cat.includes("chemistry"))
        return "Microscope";

    if (cat.includes("toán") || cat.includes("math") || cat.includes("thống kê") || cat.includes("statistics"))
        return "Calculator";

    if (cat.includes("y tế") || cat.includes("sinh học") || cat.includes("biology") || cat.includes("health") || cat.includes("y học"))
        return "HeartPulse";

    if (cat.includes("kinh") || cat.includes("business") || cat.includes("tài chính") || cat.includes("finance"))
        return "TrendingUp";

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

        // 3. Fetch unique category strings from sets where category_id is NULL
        const { data: sets, error: fetchError } = await supabase
            .from('flashcard_sets')
            .select('id, category')
            .is('category_id', null);

        if (fetchError) {
            return NextResponse.json({ error: `Failed to fetch flashcard sets: ${fetchError.message}` }, { status: 500 });
        }

        if (!sets || sets.length === 0) {
            return NextResponse.json({ message: 'No sets require migration (all have category_id).' });
        }

        // 4. Identify missing categories and deduplicate by slug AND normalized name in memory
        const missingCategoriesBySlug = new Map<string, string>(); // slug -> normalizedName
        const normalizedToRaw = new Map<string, string>(); // normalizedName -> rawName

        sets.forEach((set) => {
            if (set.category && set.category.trim() !== '') {
                const rawCat = set.category.trim();
                const normalizedCat = normalizeString(rawCat);
                const slug = generateSlug(normalizedCat);

                // Only add to insertion list if it doesn't exist in DB OR isn't already in our maps
                if (!categoryMap.has(slug) && !missingCategoriesBySlug.has(slug)) {
                    missingCategoriesBySlug.set(slug, normalizedCat);
                    normalizedToRaw.set(normalizedCat, rawCat);
                }
            }
        });

        let newCategoriesInserted = 0;
        if (missingCategoriesBySlug.size > 0) {
            const categoriesToInsert = [];

            for (const [slug, rawName] of Array.from(missingCategoriesBySlug.entries())) {
                // Determine final properties
                let finalName = rawName;
                let icon = getCategoryIcon(rawName);
                let colorClass = getCategoryColor(rawName);
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

        // 5. Update flashcard_sets with category_id (Batch processing)
        let updatedCount = 0;
        const fallbackCat = categoryMap.get(generateSlug('Chưa phân loại'));

        // We process in batches of 50 as requested
        const BATCH_SIZE = 50;
        for (let i = 0; i < sets.length; i += BATCH_SIZE) {
            const batch = sets.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (set) => {
                let assignedId = null;

                if (set.category && set.category.trim() !== '') {
                    const slug = generateSlug(set.category.trim());
                    if (slug === 'khac') {
                        assignedId = fallbackCat?.id || null;
                    } else {
                        assignedId = categoryMap.get(slug)?.id || null;
                    }
                } else {
                    assignedId = fallbackCat?.id || null;
                }

                if (assignedId) {
                    const { error: updateError } = await supabase
                        .from('flashcard_sets')
                        .update({ category_id: assignedId })
                        .eq('id', set.id);

                    if (updateError) {
                        console.error(`Error updating set ${set.id}:`, updateError);
                    } else {
                        updatedCount++;
                    }
                }
            }));
        }

        return NextResponse.json({
            message: 'Migration completed successfully',
            missingCategoriesInserted: newCategoriesInserted,
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
