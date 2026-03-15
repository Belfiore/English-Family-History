// ============================================
// FITZMAURICE & ANDREWS FAMILY TREE
// Interactive Script
// ============================================

// Person data for modal popups
const personData = {
    maurice_fitzgerald: {
        name: "Maurice FitzGerald",
        subtitle: "Lord of Lanstephan, Anglo-Norman Knight",
        tags: ["Noble", "12th Century", "Anglo-Norman"],
        description: `Maurice FitzGerald (c. 1100–1176) was an Anglo-Norman lord who played a pivotal role in the Norman invasion of Ireland in 1169. He was the son of Gerald FitzWalter of Windsor and the legendary Welsh princess Nest ferch Rhys. Maurice's descendants founded the most powerful dynasty in medieval Ireland — the Geraldines — who split into the Earls of Kildare, Earls of Desmond, Knights of Glin, and the Knights of Kerry (Fitzmaurice). His blood carried Welsh royal lineage through his mother Nest, who was daughter of Rhys ap Tewdwr, the last King of Deheubarth.`
    },
    thomas_fitzrobert: {
        name: "Thomas FitzRobert",
        subtitle: "Founder of the Kerry Branch",
        tags: ["Noble", "13th Century", "Kerry"],
        description: `Thomas FitzRobert was the grandson of Maurice FitzGerald and the first of the family to establish holdings in County Kerry. In 1253, he founded a Franciscan Abbey at Ardfert, which became one of the most significant religious houses in Munster. This act of piety established the family's deep roots in Kerry and their role as patrons of the Church.`
    },
    maurice_fitzthomas: {
        name: "Maurice FitzThomas",
        subtitle: "1st Baron of Kerry and Lixnaw",
        tags: ["Noble", "Baron", "13th Century"],
        description: `Maurice FitzThomas was created the 1st Baron of Kerry and Lixnaw around 1295, one of the oldest peerage titles in Ireland. His family, known as the "Knights of Kerry," became one of the most powerful families in Munster. They were famed for their fierce resistance to English rule in the 16th century, and their castle at Lixnaw was the seat of the barony for centuries.`
    },
    earl_kerry: {
        name: "Thomas Fitzmaurice",
        subtitle: "1st Earl of Kerry (1668–1741)",
        tags: ["Noble", "Earl", "18th Century"],
        description: `Thomas Fitzmaurice, the 21st Baron of Kerry, was elevated to the title of Earl of Kerry in the Peerage of Ireland in 1723. He married Anne Petty, daughter of the great scientist and political economist Sir William Petty and Elizabeth Waller, Baroness Shelburne. This marriage merged the Fitzmaurice line with the influential Petty family, creating the Petty-Fitzmaurice dynasty that would produce a Prime Minister.`
    },
    pm_lansdowne: {
        name: "William Petty-FitzMaurice",
        subtitle: "Prime Minister of Great Britain (1782–1783)",
        tags: ["Prime Minister", "Marquess", "18th Century"],
        description: `William Petty-FitzMaurice, 2nd Earl of Shelburne and 1st Marquess of Lansdowne (1737–1805), served as Prime Minister of Great Britain from 1782 to 1783. His greatest achievement was negotiating the Treaty of Paris (1783), which ended the American War of Independence and formally recognized the United States as a sovereign nation. He was a Whig politician known for his liberal views and support of free trade. Created Marquess of Lansdowne in 1784, he elevated the Fitzmaurice name to the highest echelons of British political power.`
    },
    r_fitzmaurice: {
        name: "Mr. R. Fitzmaurice",
        subtitle: "Father of the Bride, Hayes, Middlesex",
        tags: ["Father of Bride", "Hayes"],
        description: `Mr. R. Fitzmaurice of Hayes, Middlesex, was the father of bride Patricia Mary. He gave her away at the wedding ceremony on 11 February 1950. His wife had passed away before the wedding, as the album refers to "the late Mrs. R. Fitzmaurice." He is visible in the group photographs on the church steps. The surname Fitzmaurice, with its Norman-Irish aristocratic origins, suggests the family may have migrated from Ireland to the London suburbs during the 19th or early 20th century.`
    },
    mrs_fitzmaurice: {
        name: "Mrs. R. Fitzmaurice",
        subtitle: "Mother of the Bride (Deceased by 1950)",
        tags: ["Mother of Bride", "Deceased"],
        description: `Mrs. R. Fitzmaurice of Hayes, Middlesex, was the mother of Patricia Mary. She had passed away before the wedding, as the album inscription records "the late Mrs. R. Fitzmaurice." Her absence must have been deeply felt on the wedding day, though the family gathered together to celebrate Patricia's marriage nonetheless.`
    },
    hg_andrews: {
        name: "Mr. H.G. Andrews",
        subtitle: "Father of the Groom (Deceased by 1950)",
        tags: ["Father of Groom", "Deceased", "East Ham"],
        description: `Mr. H.G. Andrews of East Ham, London, was the father of groom Ronald. Like Mrs. Fitzmaurice, he had passed away before the wedding, as the album refers to "the late Mr. and Mrs. H.G. Andrews." East Ham was a working-class area in London's East End, heavily affected by the Blitz during World War II.`
    },
    mrs_andrews: {
        name: "Mrs. H.G. Andrews",
        subtitle: "Mother of the Groom (Deceased by 1950)",
        tags: ["Mother of Groom", "Deceased", "East Ham"],
        description: `Mrs. H.G. Andrews of East Ham, London, was the mother of groom Ronald. She too had passed away before the wedding. The loss of both the groom's parents before the wedding day added poignancy to the celebration — Ronald and Patricia each understood the absence of a parent on this joyful occasion.`
    },
    patricia: {
        name: "Patricia Mary Fitzmaurice",
        subtitle: "The Bride — Mrs. Ronald Andrews",
        tags: ["Bride", "Fitzmaurice", "Hayes"],
        description: `Patricia Mary Fitzmaurice, daughter of Mr. and the late Mrs. R. Fitzmaurice of Hayes, Middlesex, married Ronald Andrews on Saturday, 11 February 1950 at St. Mary the Virgin, Wanstead. Given away by her father, she wore a navy-blue suit, a dusty-pink halo hat, grey suede shoes and gloves, and carried a grey suede bag. A spray of red roses adorned her shoulder. Her practical yet elegant outfit was characteristic of post-war Britain, where brides often chose clothing they could wear again. The wedding album describes her and Ronald as "two noticeably happy people."`
    },
    ronald: {
        name: "Ronald Andrews",
        subtitle: "The Groom — Son of H.G. Andrews",
        tags: ["Groom", "Andrews", "East Ham"],
        description: `Ronald Andrews, son of the late Mr. and Mrs. H.G. Andrews of East Ham, London, married Patricia Mary Fitzmaurice on 11 February 1950. The wedding album captures him as a confident, smiling groom in a dark suit with a boutonnière. Having lost both parents by the time of his wedding, Ronald's joy on the day was evident in every photograph. His best man, Laurie, stood loyally beside him.`
    },
    laurie: {
        name: "Laurie",
        subtitle: "Best Man",
        tags: ["Best Man", "Andrews Side"],
        description: `Laurie served as Ronald's best man at the wedding, a role of great honour and trust. His close bond with the groom suggests he was likely a brother, cousin, or lifelong friend from East Ham. He would have been responsible for the rings, the toast at the reception, and keeping the groom calm on the big day.`
    },
    auntie_babs: {
        name: "Auntie Babs",
        subtitle: "Family Member",
        tags: ["Aunt", "Wedding Guest"],
        description: `"Auntie Babs" appears in the group photographs on the church steps. As an aunt to either the bride or groom, she was part of the close family circle. Her presence, identified by name in the album annotations, shows she was an important figure in the family.`
    },
    auntie_may: {
        name: "Auntie May",
        subtitle: "Family Member",
        tags: ["Aunt", "Wedding Guest"],
        description: `"Auntie May" is identified in the group photographs on the church steps. Another aunt in the family, she traveled to Wanstead for the ceremony — the album notes that guests came "from various far-away places" to attend.`
    },
    uncle_leslie: {
        name: "Uncle Leslie",
        subtitle: "Family Member",
        tags: ["Uncle", "Wedding Guest"],
        description: `Uncle Leslie is identified in the group photographs at St. Mary's Church. As an uncle to either the bride or groom, he was part of the inner family circle present at this important occasion.`
    },
    elizabeth: {
        name: "Elizabeth",
        subtitle: "Family Member (Seen behind Pat)",
        tags: ["Family", "Wedding Guest"],
        description: `Elizabeth is noted in the group photograph as standing "behind Pat" (Patricia). This positioning suggests she was close to the bride, possibly a sister, cousin, or close friend. Her name is annotated in the wedding album's careful handwritten captions.`
    },
    irene: {
        name: "Irene",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Irene is identified among the wedding guests in the group photographs. She was part of the extended family network that gathered at Wanstead for the celebration.`
    },
    peggy: {
        name: "Peggy",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Peggy appears in the group photographs on the church steps. She was among the family members who made the journey to Wanstead for Patricia and Ronald's wedding.`
    },
    jane: {
        name: "Jane",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Jane is identified in the group photographs at St. Mary's Church. She was one of the many family members present at the ceremony.`
    },
    daisy: {
        name: "Daisy",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Daisy is annotated in the wedding album's group photographs. The name Daisy was popular in the early 20th century, particularly among working-class families in London and the Home Counties.`
    },
    herb: {
        name: "Herb",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Herb appears in the group photographs on the church steps. He appears in the second group photo with the full guest list, identified by the album's handwritten captions.`
    },
    sandra: {
        name: "Sandra",
        subtitle: "Young Child at the Wedding",
        tags: ["Child", "Next Generation"],
        description: `Sandra was a young child at the wedding, visible in the group photographs as a small girl among the adult guests. Likely born around 1946–1948, she was probably a daughter or niece of one of the wedding guests. Her presence at the ceremony adds a touching generational dimension — she represents the future of the family, the next chapter after the war.`
    },
    renee: {
        name: "Renée",
        subtitle: "Family Member",
        tags: ["Family", "Wedding Guest"],
        description: `Renée is identified among the wedding guests. The French-influenced name was fashionable in mid-20th century Britain and suggests a connection to the family's broader European heritage.`
    },
    jack_hinder: {
        name: "Mr. Jack Hinder",
        subtitle: "Host of the Wedding Reception",
        tags: ["Host", "Friend/Family"],
        description: `Mr. Jack Hinder, along with his wife, hosted the wedding reception at their home — a charming Tudor-style house with distinctive black-and-white timber framing. The choice to hold the reception at a private home rather than a hotel or hall was typical of the era, suggesting either a family connection or close friendship. The Hinders' home provided a warm, intimate setting for the wedding breakfast and the ceremonial cutting of the cake.`
    },
    mrs_hinder: {
        name: "Mrs. Jack Hinder",
        subtitle: "Host of the Wedding Reception",
        tags: ["Host", "Friend/Family"],
        description: `Mrs. Jack Hinder co-hosted the wedding reception with her husband at their Tudor-style home. She would have been instrumental in organizing the reception — preparing the home, coordinating the catering, and ensuring the newlyweds and their guests were well looked after.`
    },
    // === NEW: From Genealogy Report ===
    camden_mother: {
        name: "Unknown Fitzmaurice Mother",
        subtitle: "Earliest known photograph in the collection",
        tags: ["Camden Town", "c.1865–1878", "Carte de Visite"],
        description: `This unidentified woman is the earliest figure in the Fitzmaurice photographic collection. She was photographed at J. Perriman's Camden Town School of Photography, at 3 Greenland Place, near the famous Mother Red Cap pub. Her dark Victorian dress with full crinoline skirt, tight bodice, and centre-parted hair dates the photograph to c.1865–1878. She sits protectively beside a young girl, almost certainly her daughter. This photograph places the Fitzmaurice family's London roots in North London (Camden Town) before later generations moved to Knightsbridge, Brixton, and the suburbs.`
    },
    camden_daughter: {
        name: "Unknown Fitzmaurice Daughter",
        subtitle: "Young child in the earliest family photograph",
        tags: ["Camden Town", "c.1865–1878", "Child"],
        description: `A young girl aged approximately 3–6 years, photographed standing on a small platform beside her mother at J. Perriman's studio in Camden Town. She wears a dress with a white apron overlay, dark stockings, and boots, with loose curly hair typical of young Victorian girls. She likely grew up to be part of the generation that produced Edward Dixon Fitzmaurice and his siblings.`
    },
    edward_dixon: {
        name: "Edward Dixon Fitzmaurice",
        subtitle: "Church of England Clergyman",
        tags: ["Clergyman", "Knightsbridge", "Victorian"],
        description: `Edward Dixon Fitzmaurice was a Church of England clergyman, photographed in a formal cabinet card portrait at the prestigious Stuart Studio, 47 & 49 Brompton Road, Knightsbridge — a West London address indicating comfortable socioeconomic standing. He wears a distinctive clerical collar and wire-framed spectacles typical of the 1890–1910 period. He is confirmed as the father of Reg and Bob Fitzmaurice by a handwritten inscription on a family photograph showing him with his two sons at what appears to be a seaside location. He should appear in Crockford's Clerical Directory, the annual register of Church of England clergy.`
    },
    edith: {
        name: "Edith Madeleine Fitzmaurice",
        subtitle: "The anchor item of the entire collection",
        tags: ["Victorian", "c.1899", "Medallion Portrait"],
        description: `Edith Madeleine Fitzmaurice (born c.1875–1880) is the central figure of the family's photographic collection. She was captured in a circular medallion photograph dated c.1899, wearing a full-length light formal gown with structured bodice and puffed sleeves, her dark hair pinned up with an ornamental headpiece. She holds a large floral bouquet and wears a pearl necklace. The circular format was an uncommon Victorian keepsake, often used as gifts or memorial items. She may be a sibling of Edward Dixon Fitzmaurice. A second photograph (full-length, from Lang Sims studio in Brixton/Folkestone) may also be her, suggesting connections to both South London and the Kent coast.`
    },
    auntie_babs_sa: {
        name: '"Babs" — Auntie Babs',
        subtitle: "Emigrated to South Africa",
        tags: ["South Africa", "Edwardian", "Emigrant"],
        description: `"Auntie Babs" emigrated to South Africa, where she was photographed as a young girl (aged 8–14) on a verandah with ornamental wrought iron railings and subtropical plants — architecture highly consistent with Cape Colony or Natal region homes of the Edwardian era. She wears a white dress with dark tie, typical of Edwardian children's fashion. The photograph is labeled "Auntie Babs, South Africa" on the back. She was a sister or sister-in-law within the Fitzmaurice family circle. NOTE: An "Auntie Babs" also appears at the 1950 wedding — this may be the same person returned from South Africa, or a different family member sharing the name.`
    },
    reg: {
        name: "Reg Fitzmaurice",
        subtitle: "Son of Edward Dixon Fitzmaurice",
        tags: ["Fitzmaurice", "Edwardian", "Son"],
        description: `Reg Fitzmaurice was one of two sons of Edward Dixon Fitzmaurice, the Church of England clergyman. He appears in a photograph labeled "Reg, Bob and their Father, Edward Dixon Fitzmaurice" on the reverse. He is the older of the two boys (approximately 8–10 years old in the photograph), pictured at what appears to be a seaside location with a large white building in the background. Through his father's family, Reg connects to the broader Fitzmaurice clan including the Earls of Orkney.`
    },
    bob: {
        name: "Bob Fitzmaurice",
        subtitle: "Son of Edward Dixon Fitzmaurice",
        tags: ["Fitzmaurice", "Edwardian", "Son"],
        description: `Bob Fitzmaurice was the younger son of Edward Dixon Fitzmaurice (approximately 3–5 years old in the family photograph). He appears alongside his brother Reg and their father in a photograph taken at a seaside location. The handwritten label on the back — "Reg, Bob and their Father, Edward Dixon Fitzmaurice" — provides primary genealogical evidence for this branch of the family.`
    },
    earl7: {
        name: "Edmond Walter Leighton Fitzmaurice",
        subtitle: "7th Earl of Orkney",
        tags: ["Earl", "Orkney", "Peerage"],
        description: `Edmond Walter Leighton Fitzmaurice was the 7th Earl of Orkney, one of the most ancient titles in the Scottish peerage. He resided at The Tythe House, Stewkley, near Leighton Buzzard, Buckinghamshire, and served as Deputy Lieutenant for the county. He died c.1951 at the age of 84, leaving an estate valued at £42,893 (equivalent to £1.5–2 million today). His wife was the celebrated Connie Gilchrist, a famous Gaiety Theatre actress who died in 1946 aged 73. The newspaper clipping about his death and the inheritance by his great-nephew Cecil was carefully preserved by the family.`
    },
    connie: {
        name: "Connie Gilchrist",
        subtitle: "Gaiety Theatre Star — Countess of Orkney",
        tags: ["Actress", "Gaiety Theatre", "Victorian Celebrity"],
        description: `Constance "Connie" Gilchrist (c.1873–1946) was one of the most famous actresses and dancers of the Victorian era. She performed at the Gaiety Theatre in London — the most celebrated entertainment venue of its time. The "Gaiety Girls" were cultural icons, and Connie's marriage to the 7th Earl of Orkney was a sensation: an actress marrying into one of the oldest peerages in Scotland. She died in 1946 aged 73. Her story connects the Fitzmaurice family to the very heart of Victorian London's theatrical and social world.`
    },
    cecil: {
        name: "Cecil O'Bryen Fitzmaurice",
        subtitle: '8th Earl of Orkney — "The Earl from Korea"',
        tags: ["Earl", "Orkney", "Korean War", "Peerage"],
        description: `Cecil O'Bryen Fitzmaurice (born c.1918) became the 8th Earl of Orkney in 1951 while serving as an R.A.S.C. army driver in the Korean War — one of the most remarkable inheritance stories of the 20th century. Known as "Ginger" in the Army, he arrived home by troopship, was late at Colombo, received 4 days confined to barracks, and scrubbed mess-decks as punishment — all while technically being an Earl. He was the great-nephew of the 7th Earl. He lived with his mother, Mrs. Dorothy Wiggins, at Lantern Hatch, Itchingfield, near Horsham, Sussex. At one time he worked in a garage. In November 1952 he married Rose Silley at St. Mary's Church, Brixham, Devon. The O'Bryen middle name hints at possible Irish aristocratic intermarriage (O'Brien). The family carefully preserved newspaper clippings about his story.`
    },
    rose: {
        name: "Rose Silley",
        subtitle: "Countess of Orkney",
        tags: ["Brixham", "Devon", "Countess"],
        description: `Rose Silley (born c.1918) married Cecil O'Bryen Fitzmaurice, the 8th Earl of Orkney, in November 1952 at St. Mary's Church, Brixham, Devon. She was 34 at the time and helped her mother run a 60-bedroomed hotel in Brixham. Their engagement was announced just days before the wedding. Through her marriage, this hotel-keeper's daughter from Devon became a Countess — the Countess of Orkney.`
    },
    dorothy: {
        name: "Mrs. Dorothy Wiggins",
        subtitle: "Mother of the 8th Earl of Orkney",
        tags: ["Horsham", "Sussex", "Mother"],
        description: `Mrs. Dorothy Wiggins was the mother of Cecil O'Bryen Fitzmaurice, the 8th Earl of Orkney. She lived at Lantern Hatch, Itchingfield, near Horsham, Sussex. Her surname "Wiggins" indicates she either remarried after a Fitzmaurice husband, or married into the Fitzmaurice family. Her connection confirms the generational link between the Victorian Fitzmaurice clergyman (Edward Dixon) and the Orkney peerage branch.`
    }
};

// ============================================
// NAVIGATION
// ============================================
const nav = document.getElementById('mainNav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 100);
});

navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

// Close mobile nav on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ============================================
// SCROLL ANIMATIONS
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.tree-generation, .context-card, .story-chapter, .chain-link').forEach(el => {
    observer.observe(el);
});

// ============================================
// PARTICLES
// ============================================
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 6) + 's';
        particle.style.width = (2 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}
createParticles();

// ============================================
// TREE FILTER
// ============================================
document.querySelectorAll('.tree-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tree-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.dataset.view;
        document.querySelectorAll('.tree-person').forEach(person => {
            const side = person.dataset.side;
            if (view === 'full') {
                person.style.opacity = '1';
                person.style.transform = 'scale(1)';
            } else if (side === view || side === 'both' || side === 'related') {
                person.style.opacity = '1';
                person.style.transform = 'scale(1)';
            } else {
                person.style.opacity = '0.2';
                person.style.transform = 'scale(0.95)';
            }
        });
    });
});

// ============================================
// MODAL
// ============================================
const modal = document.getElementById('personModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

document.querySelectorAll('.tree-person').forEach(person => {
    person.addEventListener('click', () => {
        const id = person.dataset.id;
        const data = personData[id];
        if (!data) return;

        let tagsHTML = data.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');

        modalBody.innerHTML = `
            <h3>${data.name}</h3>
            <p class="modal-subtitle">${data.subtitle}</p>
            <div style="margin-bottom: 1rem;">${tagsHTML}</div>
            <p>${data.description}</p>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// SMOOTH SCROLL FOR NAV
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const position = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: position, behavior: 'smooth' });
        }
    });
});
