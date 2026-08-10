import{_ as t,o as n,c as a,af as o}from"./chunks/framework.CgSZb0NU.js";const h=JSON.parse('{"title":"Parsing Mono","description":"","frontmatter":{},"headers":[],"relativePath":"docs/parsing-mono.md","filePath":"docs/parsing-mono.md"}'),s={name:"docs/parsing-mono.md"};function i(l,e,r,d,b,c){return n(),a("div",null,[...e[0]||(e[0]=[o(`<h1 id="parsing-mono" tabindex="-1">Parsing Mono <a class="header-anchor" href="#parsing-mono" aria-label="Permalink to &quot;Parsing Mono&quot;">​</a></h1><h2 id="roadmap" tabindex="-1">Roadmap <a class="header-anchor" href="#roadmap" aria-label="Permalink to &quot;Roadmap&quot;">​</a></h2><p>This is the hardest part of this whole guide. Get ready for a long and tedious process. Here is a roadmap:</p><ol><li>Get the pointer to mono root domain</li><li>Parse _MonoDomain struct and get domain_assemblies filed</li><li>Parse _MonoAssembly struct and get image filed</li><li>Parse _MonoImage struct and get MonoInternalHashTable field</li><li>Parse _MonoInternalHashTable struct and get table field</li><li>Parse _MonoClassDef</li><li>Parse _MonoClassField</li><li>Use the collected class information to read actual objects</li></ol><h2 id="parsing-the-instruction" tabindex="-1">Parsing the instruction <a class="header-anchor" href="#parsing-the-instruction" aria-label="Permalink to &quot;Parsing the instruction&quot;">​</a></h2><p>In the pervious part we got the <a href="https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964" target="_blank" rel="noreferrer">mono_get_root_domain</a> function that returns a pointer</p><div class="language-c vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">mono_get_root_domain</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">void</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mono_root_domain;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>When reading the next 8 bytes and disassembling them we get this:</p><div class="language-hex vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 0: 48 8b 05 fc 11 44 00   mov rax, qword ptr [rip + 0x4411fc]</span></span>
<span class="line"><span># 7: c3                     ret</span></span></code></pre></div><p>Then we extract the offset from the instruction <code>fc 11 44 00</code></p><p><code>relativeOffset</code> is <code>0x4411fc</code> (note that it is backwards because of the little endian)</p><p>This is a relative offset and the instruction is 7 bytes long, so</p><p><code>mono_root_domain</code> is <code>mono_get_root_domain</code> + <code>7</code> + <code>relativeOffset</code></p><p>This is the only instruction we will ever disassemble. The rest of this project is just reading C structs.</p><p>Go to <code>mono_root_domain</code></p><h2 id="monodomain" tabindex="-1">MonoDomain <a class="header-anchor" href="#monodomain" aria-label="Permalink to &quot;MonoDomain&quot;">​</a></h2><p>You are looking at <a href="https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/domain-internals.h#L342" target="_blank" rel="noreferrer">_MonoDomain</a> struct.</p><div class="tip custom-block"><p class="custom-block-title">By the way</p><p>Get used to reading the mono source code! I will leave all the links here so that you will know where to look at.</p><p>To keep the text compact I will not copy paste C source code but I will paste my ASCII tables for the structs.</p></div><pre class="ascii">┌────────────────────────────────────────────────────────────────────┐
│ _MonoDomain                                                        │
│ Size: ??? bytes, Alignment: 8 bytes                                │
├────────────────────────────────────────────────────────────────────┤
│   0- 47 │ MonoCoopMutex   │ lock                │ 48 bytes  │      │
│  48- 55 │ MonoAppDomain*  │ domain              │ 8 bytes   │      │
│  56- 63 │ MonoAppContext* │ default_context     │ 8 bytes   │      │
│  64- 71 │ MonoException*  │ out_of_memory_ex    │ 8 bytes   │      │
│  72- 79 │ MonoException*  │ null_reference_ex   │ 8 bytes   │      │
│  80- 87 │ MonoException*  │ stack_overflow_ex   │ 8 bytes   │      │
│  88- 95 │ MonoObject*     │ typeof_void         │ 8 bytes   │      │
│  96-103 │ MonoObject*     │ ephemeron_tombstone │ 8 bytes   │      │
│ 104-111 │ MonoArray*      │ empty_types         │ 8 bytes   │      │
│ 112-119 │ MonoString*     │ empty_string        │ 8 bytes   │      │
│ 120-127 │ MonoGHashTable* │ env                 │ 8 bytes   │      │
│ 128-135 │ MonoGHashTable* │ ldstr_table         │ 8 bytes   │      │
│ 136-139 │ guint32         │ state               │ 4 bytes   │      │
│ 140-143 │ gint32          │ domain_id           │ 4 bytes   │      │
│ 144-147 │ gint32          │ shadow_serial       │ 4 bytes   │      │
│ 148-151 │                 │ [padding]           │ 4 bytes   │      │
│ 152-159 │ GSList*         │ domain_assemblies   │ 8 bytes   │ &lt;--  │
│ 160-167 │ MonoAssembly*   │ entry_assembly      │ 8 bytes   │      │
│ 168-175 │ char*           │ friendly_name       │ 8 bytes   │ &lt;--  │
│ ... and other fields                                               │
└────────────────────────────────────────────────────────────────────┘
</pre><p>Each Mono application has its own MonoDomain. It contains Mono assemblies, static variables and heap.</p><p>Go to <code>char* friendly_name</code>. Read <code>ZT string</code>. Strings are your best friends in this project. If you are reading a string and it comes out as readable text, it means that your offsets are correct and you&#39;re doing everything right</p><p>Go to <code>GSList* domain_assemblies</code></p><p>You are looking at a <code>GSList</code></p><h2 id="gslist" tabindex="-1">GSList <a class="header-anchor" href="#gslist" aria-label="Permalink to &quot;GSList&quot;">​</a></h2><p><code>GSList</code> is a <a href="https://en.wikipedia.org/wiki/Linked_list" target="_blank" rel="noreferrer">linked list</a>.</p><pre class="ascii"> ┌────────────────────────────────────────────────────────────────────┐
 │ _GSList                                                            │
 │ Size: 16 bytes, Alignment: 8 bytes                                 │
 ├────────────────────────────────────────────────────────────────────┤
 │   0-  7 │ gpointer*       │ data    │ 8 bytes   │ &lt;--              │
 │   8- 15 │ GSList*         │ next    │ 8 bytes   │ &lt;--              │
 └────────────────────────────────────────────────────────────────────┘
</pre><p>Read <code>gpointer* data</code>. Save it. It is a general pointer with no way to know what it is pointing to (: cool, right? It points to <a href="https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214" target="_blank" rel="noreferrer">_MonoAssembly</a></p><p>Goto <code>GSList* next</code>. If it is zero, you have reached the end of the list.</p><p>Repeat until you reach the end.</p><p>Goto each <code>gpointer* data</code></p><h2 id="monoassembly" tabindex="-1">MonoAssembly <a class="header-anchor" href="#monoassembly" aria-label="Permalink to &quot;MonoAssembly&quot;">​</a></h2><p>You are looking at <a href="https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214" target="_blank" rel="noreferrer">MonoAssembly</a></p><p>MonoAssembly is a in-memory representation of a .NET dll. If you open hackmud with dotPeek or any other deobfuscator you will see the following assemblies</p><p>TODO Provide image</p><p>Assemblies can be quite large. So instead of parsing all of them, let&#39;s first get the name of each one and only parse the one we need.</p><pre class="ascii"> ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoAssembly                                                                          │
 │ Size: 128 bytes, Alignment: 8 bytes                                                    │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │   0-  3 │ gint32               │ ref_count                        │ 4 bytes   │        │
 │   4-  7 │                      │ [padding]                        │ 4 bytes   │        │
 │   8- 15 │ char*                │ basedir                          │ 8 bytes   │        │
 │  16- 95 │ MonoAssemblyName     │ aname                            │ 80 bytes  │ &lt;--    │
 │  96-103 │ MonoImage*           │ image                            │ 8 bytes   │ &lt;--    │
 │ 104-111 │ GSList*              │ friend_assembly_names            │ 8 bytes   │        │
 │ 112-112 │ guint8               │ friend_assembly_names_inited     │ 1 byte    │        │
 │ 113-113 │ guint8               │ in_gac                           │ 1 byte    │        │
 │ 114-114 │ guint8               │ dynamic                          │ 1 byte    │        │
 │ 115-115 │ guint8               │ corlib_internal                  │ 1 byte    │        │
 │ 116-119 │ MonoAssemblyContext  │ context                          │ 4 bytes   │        │
 │ 120-120 │ guint8               │ wrap_non_exception_throws        │ 1 byte    │        │
 │ 121-121 │ guint8               │ wrap_non_exception_throws_inited │ 1 byte    │        │
 │ 122-122 │ guint8               │ jit_optimizer_disabled           │ 1 byte    │        │
 │ 123-123 │ guint8               │ jit_optimizer_disabled_inited    │ 1 byte    │        │
 │ 124-127 │ guint32              │ flags                            │ 4 bytes   │        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ MonoAssemblyName                                                                       │
 │ Size: 80 bytes, Alignment: 8 bytes                                                     │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │   0-  7 │ char*                │ name                     │ 8 bytes   │ &lt;--            │
 │   8- 15 │ char*                │ culture                  │ 8 bytes   │                │
 │  16- 23 │ char*                │ hash_value               │ 8 bytes   │                │
 │  24- 31 │ mono_byte*           │ public_key               │ 8 bytes   │                │
 │  32- 48 │ mono_byte            │ public_key_token         │ 17 bytes  │                │
 │  49- 51 │                      │ [padding]                │ 3 bytes   │                │
 │  52- 55 │ uint32_t             │ hash_alg                 │ 4 bytes   │                │
 │  56- 59 │ uint32_t             │ hash_len                 │ 4 bytes   │                │
 │  60- 63 │ uint32_t             │ flags                    │ 4 bytes   │                │
 │  64- 65 │ uint16_t             │ major                    │ 2 bytes   │                │
 │  66- 67 │ uint16_t             │ minor                    │ 2 bytes   │                │
 │  68- 69 │ uint16_t             │ build                    │ 2 bytes   │                │
 │  70- 71 │ uint16_t             │ revision                 │ 2 bytes   │                │
 │  72- 73 │ uint16_t             │ arch                     │ 2 bytes   │                │
 │  74- 74 │ MonoBoolean          │ without_version          │ 1 byte    │                │
 │  75- 75 │ MonoBoolean          │ without_culture          │ 1 byte    │                │
 │  76- 76 │ MonoBoolean          │ without_public_key_token │ 1 byte    │                │
 │  77- 79 │                      │ [padding]                │ 3 bytes   │                │
 └────────────────────────────────────────────────────────────────────────────────────────┘
</pre><div class="tip custom-block"><p class="custom-block-title">TIP</p><p><a href="https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/metadata-internals.h#L161" target="_blank" rel="noreferrer">MonoAssemblyName aname</a> is a struct, not a pointer. It is inlined.</p></div><p>Goto <code>MonoAssemblyName aname</code>. Read a <code>ZT string</code>.</p><p>We are only interested an assembly with a name <code>Core</code>.</p><p>Goto <code>MonoImage* image</code></p><h2 id="monoimage" tabindex="-1">MonoImage <a class="header-anchor" href="#monoimage" aria-label="Permalink to &quot;MonoImage&quot;">​</a></h2><p>You are looking at <a href="https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355" target="_blank" rel="noreferrer">MonoImage</a></p><p>Mono assembly is just a container for Mono image. It describes the structures of all classes and methods</p><pre class="ascii"> ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoImage                                                                        │
 │ Size: 1272 bytes, Alignment: 8 bytes                                              │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   3 │ int                       │ ref_count              │ 4 bytes   │      │
 │    4-   7 │                           │ [padding]              │ 4 bytes   │      │
 │    8-  15 │ MonoImageStorage*         │ storage                │ 8 bytes   │      │
 │   16-  23 │ char*                     │ raw_data               │ 8 bytes   │      │
 │   24-  27 │ guint32                   │ raw_data_len           │ 4 bytes   │      │
 │   28-  28 │ guint8                    │ dynamic                │ 1 byte    │      │
 │   29-  29 │ guint8                    │ ref_only               │ 1 byte    │      │
 │   30-  30 │ guint8                    │ uncompressed_metadata  │ 1 byte    │      │
 │   31-  31 │ guint8                    │ metadata_only          │ 1 byte    │      │
 │   32-  32 │ guint8                    │ load_from_context      │ 1 byte    │      │
 │   33-  33 │ guint8                    │ checked_module_cctor   │ 1 byte    │      │
 │   34-  34 │ guint8                    │ has_module_cctor       │ 1 byte    │      │
 │   35-  35 │ guint8                    │ idx_string_wide        │ 1 byte    │      │
 │   36-  36 │ guint8                    │ idx_guid_wide          │ 1 byte    │      │
 │   37-  37 │ guint8                    │ idx_blob_wide          │ 1 byte    │      │
 │   38-  38 │ guint8                    │ core_clr_platform_code │ 1 byte    │      │
 │   39-  39 │ guint8                    │ minimal_delta          │ 1 byte    │      │
 │   40-  47 │ char*                     │ name                   │ 8 bytes   │      │
 │   48-  55 │ char*                     │ filename               │ 8 bytes   │      │
 │   56-  63 │ char*                     │ assembly_name          │ 8 bytes   │      │
 │   64-  71 │ char*                     │ module_name            │ 8 bytes   │      │
 │   72-  75 │ guint32                   │ time_date_stamp        │ 4 bytes   │      │
 │   76-  79 │                           │ [padding]              │ 4 bytes   │      │
 │   80-  87 │ char*                     │ version                │ 8 bytes   │      │
 │   88-  89 │ gint16                    │ md_version_major       │ 2 bytes   │      │
 │   90-  91 │ gint16                    │ md_version_minor       │ 2 bytes   │      │
 │   92-  95 │                           │ [padding]              │ 4 bytes   │      │
 │   96- 103 │ char*                     │ guid                   │ 8 bytes   │      │
 │  104- 111 │ MonoCLIImageInfo*         │ image_info             │ 8 bytes   │      │
 │  112- 119 │ MonoMemPool*              │ mempool                │ 8 bytes   │      │
 │  120- 127 │ char*                     │ raw_metadata           │ 8 bytes   │      │
 │  128- 143 │ MonoStreamHeader          │ heap_strings           │ 16 bytes  │      │
 │  144- 159 │ MonoStreamHeader          │ heap_us                │ 16 bytes  │      │
 │  160- 175 │ MonoStreamHeader          │ heap_blob              │ 16 bytes  │      │
 │  176- 191 │ MonoStreamHeader          │ heap_guid              │ 16 bytes  │      │
 │  192- 207 │ MonoStreamHeader          │ heap_tables            │ 16 bytes  │      │
 │  208- 223 │ MonoStreamHeader          │ heap_pdb               │ 16 bytes  │      │
 │  224- 231 │ char*                     │ tables_base            │ 8 bytes   │      │
 │  232- 239 │ guint64                   │ referenced_tables      │ 8 bytes   │      │
 │  240- 247 │ int*                      │ referenced_table_rows  │ 8 bytes   │      │
 │  248-1127 │ MonoTableInfo             │ tables                 │ 880 bytes │      │
 │ 1128-1135 │ MonoAssembly**            │ references             │ 8 bytes   │      │
 │ 1136-1139 │ int                       │ nreferences            │ 4 bytes   │      │
 │ 1140-1143 │                           │ [padding]              │ 4 bytes   │      │
 │ 1144-1151 │ MonoImage**               │ modules                │ 8 bytes   │      │
 │ 1152-1155 │ guint32                   │ module_count           │ 4 bytes   │      │
 │ 1156-1159 │                           │ [padding]              │ 4 bytes   │      │
 │ 1160-1167 │ gboolean*                 │ modules_loaded         │ 8 bytes   │      │
 │ 1168-1175 │ MonoImage**               │ files                  │ 8 bytes   │      │
 │ 1176-1179 │ guint32                   │ file_count             │ 4 bytes   │      │
 │ 1180-1183 │                           │ [padding]              │ 4 bytes   │      │
 │ 1184-1191 │ MonoAotModule*            │ aot_module             │ 8 bytes   │      │
 │ 1192-1207 │ guint8                    │ aotid                  │ 16 bytes  │      │
 │ 1208-1215 │ MonoAssembly*             │ assembly               │ 8 bytes   │      │
 │ 1216-1223 │ MonoAssemblyLoadContext*  │ alc                    │ 8 bytes   │      │
 │ 1224-1231 │ GHashTable*               │ method_cache           │ 8 bytes   │      │
 │ 1232-1271 │ MonoInternalHashTable     │ class_cache            │ 40 bytes  │ &lt;--  │
 │ ... and other fields                                                              │                
 └───────────────────────────────────────────────────────────────────────────────────┘
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoInternalHashTable                                                            │
 │ Size: 40 bytes, Alignment: 8 bytes                                                │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   7 │ GHashFunc*                      │ hash_func   │ 8 bytes   │           │
 │    8-  15 │ MonoInternalHashKeyExtractFunc* │ key_extract │ 8 bytes   │           │
 │   16-  23 │ MonoInternalHashNextValueFunc*  │ next_value  │ 8 bytes   │           │
 │   24-  27 │ gint                            │ size        │ 4 bytes   │ &lt;--       │
 │   28-  31 │ gint                            │ num_entries │ 4 bytes   │ &lt;--       │
 │   32-  39 │ gpointer*                       │ table       │ 8 bytes   │ &lt;--       │
 └───────────────────────────────────────────────────────────────────────────────────┘
</pre><p>We are interested in <a href="https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/utils/mono-internal-hash.h#L36" target="_blank" rel="noreferrer">MonoInternalHashTable</a></p><p>Unsurprisingly, it is a <a href="https://en.wikipedia.org/wiki/Hash_table" target="_blank" rel="noreferrer">hash table</a>.</p><p>Read <code>gint size</code>. Number of bytes that takes the array at <code>gpointer* table</code>.</p><p><code>num_lines</code> is <code>gint size</code> / <code>8</code>. How many elements are in <code>gpointer* table</code></p><p>Read <code>gint num_entries</code>. (optional) Number of elements in the entire hash table</p><p>Read <code>gpointer* table</code>. Pointer to an array of pointers to <code>MonoClassDef</code></p><p>Go to <code>gpointer* table</code> and read <code>num_lines</code> pointers</p><p>You now have an array of pointers to <code>MonoClassDef</code></p><p>Go to each pointer</p><h2 id="monoclassdef" tabindex="-1">MonoClassDef <a class="header-anchor" href="#monoclassdef" aria-label="Permalink to &quot;MonoClassDef&quot;">​</a></h2><p>You are looking at <a href="https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L135" target="_blank" rel="noreferrer">MonoClassDef</a></p><p>And also you are looking at <a href="https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L14" target="_blank" rel="noreferrer">MonoClass</a>, because it is right at the start of the struct</p><pre class="ascii"> ┌──────────────────────────────────────────────────────────────┐
 │ _MonoClassDef                                                │
 │ Size: 264 bytes, Alignment: 8 bytes                          │
 ├──────────────────────────────────────────────────────────────┤
 │    0- 231 │ MonoClass  │ klass            │ 232 bytes │ &lt;--  │
 │  232- 235 │ guint32    │ flags            │ 4 bytes   │      │
 │  236- 239 │ guint32    │ first_method_idx │ 4 bytes   │      │
 │  240- 243 │ guint32    │ first_field_idx  │ 4 bytes   │      │
 │  244- 247 │ guint32    │ method_count     │ 4 bytes   │      │
 │  248- 251 │ guint32    │ field_count      │ 4 bytes   │ &lt;--  │
 │  252- 255 │            │ [padding]        │ 4 bytes   │      │
 │  256- 263 │ MonoClass* │ next_class_cache │ 8 bytes   │ &lt;--  │
 └──────────────────────────────────────────────────────────────┘
</pre><p>Read <code>MonoClass* next_class_cache</code>. It points to the next <code>MonoClassDef</code>. If it is <code>0</code> you have reached the end</p><p>Process <code>MonoClass klass</code> as described in the next section</p><p>Go to <code>MonoClass* next_class_cache</code></p><p>Repeat until the end</p><h2 id="monoclass" tabindex="-1">MonoClass <a class="header-anchor" href="#monoclass" aria-label="Permalink to &quot;MonoClass&quot;">​</a></h2><p>You are looking at <a href="https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L14" target="_blank" rel="noreferrer">MonoClass</a></p><p>Mono class is exactly what it sounds like. We have reached the actual class definition.</p><pre class="ascii"> ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoClass                                                                        │
 │ Size: 232 bytes, Alignment: 8 bytes                                               │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   7 │ MonoClass*            │ element_class            │ 8 bytes   │        │
 │    8-  15 │ MonoClass*            │ cast_class               │ 8 bytes   │        │
 │   16-  23 │ MonoClass*            │ supertypes               │ 8 bytes   │        │
 │   24-  25 │ guint16               │ idepth                   │ 2 bytes   │        │
 │   26-  26 │ guint8                │ rank                     │ 1 byte    │        │
 │   27-  27 │ guint8                │ class_kind               │ 1 byte    │        │
 │   28-  31 │ guint                 │ bitfields1               │ 4 bytes   │ &lt;--    │
 │   32-  32 │ guint8                │ min_align                │ 1 byte    │        │
 │   33-  33 │                       │ bitfields2               │ 1 byte    │        │
 │   34-  34 │                       │ bitfields3               │ 1 byte    │        │
 │   35-  35 │                       │ bitfields4               │ 1 byte    │        │
 │   36-  39 │                       │ [padding]                │ 4 bytes   │        │
 │   40-  47 │ MonoClass*            │ parent                   │ 8 bytes   │ &lt;--    │
 │   48-  55 │ MonoClass*            │ nested_in                │ 8 bytes   │        │
 │   56-  63 │ MonoImage*            │ image                    │ 8 bytes   │        │
 │   64-  71 │ const char*           │ name                     │ 8 bytes   │ &lt;--    │
 │   72-  79 │ const char*           │ name_space               │ 8 bytes   │ &lt;--    │
 │   80-  83 │ guint32               │ type_token               │ 4 bytes   │        │
 │   84-  87 │ int                   │ vtable_size              │ 4 bytes   │        │
 │   88-  89 │ guint16               │ interface_count          │ 2 bytes   │        │
 │   90-  91 │                       │ [padding]                │ 2 bytes   │        │
 │   92-  95 │ guint32               │ interface_id             │ 4 bytes   │        │
 │   96-  99 │ guint32               │ max_interface_id         │ 4 bytes   │        │
 │  100- 101 │ guint16               │ interface_offsets_count  │ 2 bytes   │        │
 │  102- 103 │                       │ [padding]                │ 2 bytes   │        │
 │  104- 111 │ MonoClass*            │ interfaces_packed        │ 8 bytes   │        │
 │  112- 119 │ guint16*              │ interface_offsets_packed │ 8 bytes   │        │
 │  120- 127 │ guint8*               │ interface_bitmap         │ 8 bytes   │        │
 │  128- 135 │ MonoClass*            │ interfaces               │ 8 bytes   │        │
 │  136- 139 │ union _MonoClassSizes │ sizes                    │ 4 bytes   │ &lt;--    │
 │  140- 143 │                       │ [padding]                │ 4 bytes   │        │
 │  144- 151 │ MonoClassField*       │ fields                   │ 8 bytes   │ &lt;--    │
 │  152- 159 │ MonoMethod*           │ methods                  │ 8 bytes   │        │
 │  160- 175 │ MonoType              │ this_arg                 │ 16 bytes  │ &lt;--    │
 │  176- 191 │ MonoType              │ _byval_arg               │ 16 bytes  │        │
 │  192- 199 │ MonoGCDescriptor*     │ gc_descr                 │ 8 bytes   │        │
 │  200- 207 │ MonoClassRuntimeInfo* │ runtime_info             │ 8 bytes   │ &lt;--    │
 │  208- 215 │ MonoMethod*           │ vtable                   │ 8 bytes   │        │
 │  216- 223 │ MonoPropertyBag*      │ infrequent_data          │ 8 bytes   │        │
 │  224- 231 │ void*                 │ unity_user_data          │ 8 bytes   │        │
 └───────────────────────────────────────────────────────────────────────────────────┘
</pre><p>TODO Tweak how bitfields are displayed, or just explain</p><p>TODO Explain this</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const flags1 = klass.bitfields1; // inited, size_inited, valuetype, enumtype, blittable, unicode, wastypebuilder, is_array_special_interface, is_byreflike</span></span>
<span class="line"><span>const isValueType = (flags1 &amp; (1 &lt;&lt; 2)) != 0;</span></span>
<span class="line"><span>const isEnum = (flags1 &amp; (1 &lt;&lt; 3)) != 0;</span></span>
<span class="line"><span>const this_arg_type = this.parseFieldType(klass.this_arg);</span></span></code></pre></div>`,68)])])}const y=t(s,[["render",i]]);export{h as __pageData,y as default};
