(() => {
  const state = {
    data: null,
    // 记录所有图表块，支持一个项目内多个图表惰性初始化
    charts: []
  };

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderBasicInfo(basic = {}) {
    const nameEl = document.getElementById('about-name');
    const titleEl = document.getElementById('about-title');
    const locationEl = document.getElementById('about-location');
    const summaryEl = document.getElementById('about-summary');
    const avatarEl = document.getElementById('avatar');
    const contactsEl = document.getElementById('contact-list');

    if (!basic) basic = {};

    if (nameEl && basic.name) {
      nameEl.textContent = basic.name;
      document.title = `${basic.name} · 个人主页`;
    }

    if (titleEl && basic.title) {
      titleEl.textContent = basic.title;
    }

    if (locationEl && basic.location) {
      locationEl.textContent = basic.location;
    }

    if (summaryEl && basic.summary) {
      summaryEl.textContent = basic.summary;
    }

    if (avatarEl) {
      const src = basic.avatar || avatarEl.getAttribute('src') || 'avatar-placeholder.svg';
      avatarEl.setAttribute('src', src);
      const altName = basic.name || '头像';
      avatarEl.setAttribute('alt', `${altName} 的头像`);
    }

    if (contactsEl) {
      contactsEl.innerHTML = '';
      const contacts = safeArray(basic.contacts);
      if (!contacts.length) {
        const tip = document.createElement('p');
        tip.className = 'text-xs text-slate-500';
        tip.textContent = '你可以在 data.json 中配置邮箱、GitHub、微信等联系方式。';
        contactsEl.appendChild(tip);
        return;
      }

      contacts.forEach((contact) => {
        const chip = createContactChip(contact);
        if (chip) contactsEl.appendChild(chip);
      });
    }
  }

  function createContactChip(contact = {}) {
    const wrapper = document.createElement(contact.href ? 'a' : 'div');
    wrapper.className =
      'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-primary-500 hover:text-primary-700 hover:shadow-primary-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50';

    if (contact.href) {
      wrapper.href = contact.href;
      wrapper.target = contact.href.startsWith('http') ? '_blank' : '_self';
      wrapper.rel = contact.href.startsWith('http') ? 'noreferrer' : '';
    }

    const icon = document.createElement('i');
    icon.className = `${resolveContactIcon(contact.type)} text-base`;
    wrapper.appendChild(icon);

    const text = document.createElement('span');
    const label = contact.label || contact.type || '联系';
    const value = contact.value || '';
    text.textContent = value ? `${label} · ${value}` : label;
    wrapper.appendChild(text);

    return wrapper;
  }

  function resolveContactIcon(type) {
    switch ((type || '').toLowerCase()) {
      case 'email':
        return 'ri-mail-line';
      case 'github':
        return 'ri-github-line';
      case 'linkedin':
        return 'ri-linkedin-line';
      case 'wechat':
        return 'ri-wechat-line';
      case 'phone':
        return 'ri-phone-line';
      default:
        return 'ri-user-line';
    }
  }

  // 将文本块的 text 规范化为段落数组，支持 string 或 string[]
  function normalizeTextBlockLines(text) {
    if (!text) return [];

    if (Array.isArray(text)) {
      return text
        .map((t) => (t == null ? '' : String(t)))
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return String(text)
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // 为惰性图表初始化注册配置
  function registerChartDefinition(chartId, chartSource) {
    const info = chartSource || {};
    const dataset = safeArray(info.dataset);

    state.charts.push({
      id: chartId,
      chartInfo: {
        title: info.title,
        unit: info.unit,
        dataset
      },
      initialized: false,
      instance: null
    });
  }

  // 将受控 HTML 字符串转换为只包含少量安全标签的节点
  function createSafeHtmlContainer(html) {
    const allowedTags = new Set(['P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'BR']);
    const container = document.createElement('div');
    container.innerHTML = String(html);

    function sanitize(node) {
      const children = Array.from(node.children);
      children.forEach((child) => {
        const tagName = child.tagName;
        if (!allowedTags.has(tagName)) {
          // 递归处理子节点后，将不在白名单中的标签打散
          sanitize(child);
          const fragment = document.createDocumentFragment();
          while (child.firstChild) {
            fragment.appendChild(child.firstChild);
          }
          child.replaceWith(fragment);
        } else {
          if (tagName === 'A') {
            const href = child.getAttribute('href') || '';
            if (href) {
              child.target = href.startsWith('http') ? '_blank' : '_self';
              child.rel = href.startsWith('http') ? 'noreferrer' : '';
            }
          }
          sanitize(child);
        }
      });
    }

    sanitize(container);
    return container;
  }

  // 根据当前展开内容动态更新折叠面板高度，避免内容被裁剪
  function recalculatePanelHeight(panel) {
    if (!panel || panel.getAttribute('aria-hidden') === 'true') return;

    // 当面板已经是 auto 高度时，由内容自然决定高度，不再通过 max-height 控制
    if (panel.style.maxHeight === 'none') {
      return;
    }

    const scrollHeight = panel.scrollHeight;
    panel.style.maxHeight = `${scrollHeight}px`;
  }

  // 为面板内媒体元素注册加载事件，媒体尺寸变化时重新测量高度
  function setupMediaLoadListeners(panel) {
    if (!panel || panel.dataset.mediaListenersAttached === 'true') return;
    panel.dataset.mediaListenersAttached = 'true';

    const handleMediaLoad = () => {
      recalculatePanelHeight(panel);
    };

    const mediaElements = panel.querySelectorAll('img, iframe, video');
    mediaElements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'video') {
        el.addEventListener('loadedmetadata', handleMediaLoad);
        el.addEventListener('loadeddata', handleMediaLoad);
      } else {
        el.addEventListener('load', handleMediaLoad);
      }
    });
  }

  let accordionResizeListenerRegistered = false;

  // 只注册一次全局 resize 监听，窗口尺寸变化时对所有已展开面板重新测量高度
  function ensureAccordionResizeListener() {
    if (accordionResizeListenerRegistered) return;
    accordionResizeListenerRegistered = true;

    window.addEventListener('resize', () => {
      const openPanels = document.querySelectorAll(
        '.accordion-item--open .accordion-panel'
      );
      openPanels.forEach((panel) => {
        recalculatePanelHeight(panel);
      });
    });
  }

  // 统一渲染 contentBlocks 中的内容块，支持 text / image / table / video / chart / row
  function renderContentBlock(block, context) {
    if (!block || !block.type) return null;

    const project = (context && context.project) || {};
    const projectIndex =
      context && context.projectIndex != null ? context.projectIndex : 0;
    const blockIndex =
      context && context.blockIndex != null ? context.blockIndex : 0;
    const chartIds = (context && context.chartIds) || null;

    const type = String(block.type).toLowerCase();

    // 行布局：在同一行展示多个子内容块
    if (type === 'row') {
      const cols = block.columns === 3 ? 3 : 2;
      const row = document.createElement('div');
      row.className = `content-row grid grid-cols-1 gap-4 md:grid-cols-${cols}`;

      const items = safeArray(block.items);
      items.forEach((child, childIndex) => {
        const renderedChild = renderContentBlock(child, {
          project,
          projectIndex,
          blockIndex: `${blockIndex}-${childIndex}`,
          chartIds
        });
        if (renderedChild) {
          row.appendChild(renderedChild);
        }
      });

      if (!row.childNodes.length) return null;
      return row;
    }

    // 文本块：支持 text / html / list
    if (type === 'text') {
      const section = document.createElement('section');
      section.className = 'content-block content-block--text';

      if (block.html) {
        // 优先使用 html 字段，插入受控 HTML
        const safeContainer = createSafeHtmlContainer(block.html);
        while (safeContainer.firstChild) {
          section.appendChild(safeContainer.firstChild);
        }
      } else {
        const lines = normalizeTextBlockLines(block.text);
        lines.forEach((line) => {
          const p = document.createElement('p');
          p.className = 'text-xs leading-relaxed text-slate-600 md:text-sm';
          p.textContent = line;
          section.appendChild(p);
        });

        const list = block.list;
        if (list && Array.isArray(list.items) && list.items.length) {
          const listEl = document.createElement(list.ordered ? 'ol' : 'ul');
          list.items.forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            listEl.appendChild(li);
          });
          section.appendChild(listEl);
        }
      }

      if (!section.childNodes.length) return null;
      return section;
    }

    // 图片块：支持 maxHeight / size / aspectRatio / fit，并遵循 maxHeight/size 优先级
    if (type === 'image') {
      const figure = document.createElement('figure');
      figure.className = 'content-block content-block--image';

      const img = document.createElement('img');
      img.src = block.src || project.image || 'project-placeholder-1.svg';
      img.alt =
        block.alt ||
        project.imageAlt ||
        `${project.name || '项目'} 的界面示意图`;
      img.loading = 'lazy';
      img.className =
        'w-full h-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]';

      const fit = (block.fit || 'contain').toLowerCase();

      const hasExplicitMaxHeight =
        typeof block.maxHeight === 'number' && block.maxHeight > 0;
      const sizeValue =
        typeof block.size === 'string' ? block.size.toLowerCase() : '';
      const hasSizePreset =
        sizeValue === 'sm' || sizeValue === 'md' || sizeValue === 'lg';
      const hasSizeControl = hasExplicitMaxHeight || hasSizePreset;

      // 基础 object-fit：默认 contain，cover 情形下后续可能配合 aspectRatio 做裁剪
      img.style.objectFit = fit === 'cover' ? 'cover' : 'contain';

      if (hasExplicitMaxHeight) {
        // 显式像素高度优先：通过 maxHeight 控制整体高度
        img.style.maxHeight = `${block.maxHeight}px`;
      } else if (hasSizePreset) {
        // 其次是 size 预设档位
        img.classList.add(`img-size-${sizeValue}`);
      }

      // 仅在未指定 maxHeight/size 且 fit === 'cover' 的情况下使用 aspectRatio
      if (
        typeof block.aspectRatio === 'string' &&
        !hasSizeControl &&
        fit === 'cover'
      ) {
        const parts = block.aspectRatio.split('/');
        if (parts.length === 2) {
          const w = parts[0].trim();
          const h = parts[1].trim();
          if (w && h) {
            figure.style.aspectRatio = `${w} / ${h}`;
            // 固定比例容器，内部图片铺满并裁剪溢出部分
            figure.style.overflow = 'hidden';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
          }
        }
      }

      // 其余情况（包含 fit === 'contain' 或已指定 maxHeight/size），不设置 aspectRatio，
      // 让图片按 contain + 自然高度渲染，避免容器被比例撑高但图片仅占一部分高度。

      figure.appendChild(img);

      if (block.caption) {
        const caption = document.createElement('figcaption');
        caption.className =
          'border-t border-slate-100 bg-white/60 px-4 py-2 text-[11px] text-slate-500';
        caption.textContent = block.caption;
        figure.appendChild(caption);
      }

      // 支持单击图片查看大图，并提供键盘无障碍访问
      if (lightbox && typeof lightbox.open === 'function') {
        img.style.cursor = 'zoom-in';
        img.setAttribute('role', 'button');
        img.tabIndex = 0;

        const openImagePreview = () => {
          lightbox.open(img.src, img.alt);
        };

        img.addEventListener('click', () => {
          openImagePreview();
        });

        img.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImagePreview();
          }
        });
      }

      return figure;
    }

    // 表格块
    if (type === 'table') {
      const columns = safeArray(block.columns);
      const rows = safeArray(block.rows);
      if (!columns.length && !rows.length) return null;

      const tableBlock = document.createElement('div');
      tableBlock.className = 'content-block content-block--table';

      const wrapper = document.createElement('div');
      wrapper.className = 'content-table-wrapper';

      const table = document.createElement('table');
      table.className = 'content-table';

      if (columns.length) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        columns.forEach((col) => {
          const th = document.createElement('th');
          th.textContent = col;
          tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
      }

      if (rows.length) {
        const tbody = document.createElement('tbody');
        rows.forEach((row) => {
          const tr = document.createElement('tr');
          safeArray(row).forEach((cell) => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
      }

      wrapper.appendChild(table);
      tableBlock.appendChild(wrapper);
      return tableBlock;
    }

    // 视频块
    if (type === 'video') {
      const videoBlock = document.createElement('div');
      videoBlock.className =
        'content-block content-block--media content-block--video';

      const videoBox = document.createElement('div');
      videoBox.className = 'w-full';
      videoBox.style.aspectRatio = '16 / 9';

      const iframe = document.createElement('iframe');
      const video = block || {};
      iframe.src =
        video.iframeSrc ||
        video.src ||
        (project.video && project.video.iframeSrc) ||
        'https://www.youtube.com/embed/dQw4w9WgXcQ';
      iframe.title =
        video.title ||
        (project.video && project.video.title) ||
        `${project.name || '项目'} 视频占位`;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.loading = 'lazy';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.className =
        'h-full w-full border-0 transition-transform duration-200 group-hover:scale-[1.02]';

      videoBox.appendChild(iframe);
      videoBlock.appendChild(videoBox);
      return videoBlock;
    }

    // 图表块
    if (type === 'chart') {
      const chartId = `chart-${project.id || projectIndex}-${blockIndex}`;
      const chartBlock = document.createElement('div');
      chartBlock.className =
        'content-block content-block--media content-block--chart';

      const chartContainer = document.createElement('div');
      chartContainer.id = chartId;
      chartContainer.className = 'h-56 w-full md:h-64';
      chartContainer.setAttribute(
        'aria-label',
        block.title ? `${block.title} · 交互式图表` : '项目进度示例图表'
      );

      chartBlock.appendChild(chartContainer);

      registerChartDefinition(chartId, block);
      if (chartIds && Array.isArray(chartIds)) {
        chartIds.push(chartId);
      }

      return chartBlock;
    }

    return null;
  }

  function renderProjects(projects) {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    container.innerHTML = '';
    state.charts = [];

    const list = safeArray(projects);
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent = '暂未配置项目。你可以在 data.json 的 projects 字段中添加示例项目。';
      container.appendChild(empty);
      return;
    }

    list.forEach((project, index) => {
      const item = document.createElement('article');
      item.className =
        'accordion-item group rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md hover:shadow-primary-100';

      const headerButton = document.createElement('button');
      headerButton.type = 'button';
      headerButton.className =
        'accordion-header flex w-full items-start justify-between gap-3 text-left focus:outline-none';

      const panelId = `project-panel-${project.id || index}`;
      const headerId = `project-header-${project.id || index}`;
      headerButton.id = headerId;
      headerButton.setAttribute('aria-expanded', 'false');
      headerButton.setAttribute('aria-controls', panelId);

      const textBox = document.createElement('div');
      textBox.className = 'flex-1';

      const title = document.createElement('h3');
      title.className = 'text-sm font-semibold text-slate-900 md:text-base';
      title.textContent = project.name || '未命名项目';

      const isHighlighted =
        project && (project.highlight === true || project.badge === 'star');

      if (isHighlighted) {
        const star = document.createElement('span');
        star.className =
          'project-title-star ml-2 inline-flex items-center justify-center';
        const starIcon = document.createElement('i');
        starIcon.className = 'ri-star-fill project-title-star-icon';
        starIcon.setAttribute('role', 'img');
        starIcon.setAttribute('aria-label', '重点项目');
        star.appendChild(starIcon);
        title.appendChild(star);
      }

      textBox.appendChild(title);

      const brief = document.createElement('p');
      brief.className = 'accordion-summary mt-1 text-xs text-slate-600 md:text-sm';
      brief.textContent =
        project.summary || '在 data.json 中补充该项目的一句简短介绍。';
      textBox.appendChild(brief);

      headerButton.appendChild(textBox);

      const metaBox = document.createElement('div');
      metaBox.className = 'flex shrink-0 flex-col items-end gap-1 pl-2 text-right';

      if (project.role || project.period) {
        const meta = document.createElement('p');
        meta.className = 'text-[11px] text-slate-500 md:text-xs';
        const role = project.role || '';
        const period = project.period || '';
        meta.textContent = [role, period].filter(Boolean).join(' · ');
        metaBox.appendChild(meta);
      }

      const iconWrapper = document.createElement('span');
      iconWrapper.className =
        'accordion-icon inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm shadow-slate-200/80';
      const icon = document.createElement('i');
      icon.className = 'ri-arrow-down-s-line text-base';
      iconWrapper.appendChild(icon);
      metaBox.appendChild(iconWrapper);

      headerButton.appendChild(metaBox);
      item.appendChild(headerButton);

      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'accordion-panel mt-3 space-y-3';
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', headerId);
      panel.setAttribute('aria-hidden', 'true');

      const chartIds = [];

      // 元信息行：角色 / 时间 / 标签
      if (
        project.role ||
        project.period ||
        (Array.isArray(project.tags) && project.tags.length)
      ) {
        const metaRow = document.createElement('div');
        metaRow.className =
          'flex flex-wrap items-center gap-2 text-[11px] text-slate-500 md:text-xs';

        if (project.role || project.period) {
          const primaryMeta = document.createElement('span');
          primaryMeta.textContent = [project.role || '', project.period || '']
            .filter(Boolean)
            .join(' · ');
          metaRow.appendChild(primaryMeta);
        }

        if (Array.isArray(project.tags) && project.tags.length) {
          const tags = document.createElement('div');
          tags.className = 'flex flex-wrap gap-1';
          project.tags.forEach((tag) => {
            const chip = document.createElement('span');
            chip.className =
              'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700';
            chip.textContent = tag;
            tags.appendChild(chip);
          });
          metaRow.appendChild(tags);
        }

        panel.appendChild(metaRow);
      }

      // 项目详细说明请通过 contentBlocks 的 text / html / list 等字段承载，避免与 header summary 重复。
      const blocks = safeArray(project.contentBlocks);

      if (blocks.length) {
        blocks.forEach((block, blockIndex) => {
          const rendered = renderContentBlock(block, {
            project,
            projectIndex: index,
            blockIndex,
            chartIds
          });
          if (rendered) {
            panel.appendChild(rendered);
          }
        });
      } else {
        // 兼容旧数据：未配置 contentBlocks 时，退回到 type 字段渲染路径
        const legacyType = (project.type || 'image').toLowerCase();
        let fallbackBlock = null;

        if (legacyType === 'chart') {
          const chartInfo = project.chart || {};
          fallbackBlock = {
            type: 'chart',
            title: chartInfo.title,
            unit: chartInfo.unit,
            dataset: safeArray(chartInfo.dataset)
          };
        } else if (legacyType === 'video') {
          const video = project.video || {};
          fallbackBlock = {
            type: 'video',
            iframeSrc: video.iframeSrc,
            title: video.title
          };
        } else {
          fallbackBlock = {
            type: 'image',
            src: project.image,
            alt: project.imageAlt
          };
        }

        const renderedFallback = renderContentBlock(fallbackBlock, {
          project,
          projectIndex: index,
          blockIndex: 'fallback',
          chartIds
        });
        if (renderedFallback) {
          panel.appendChild(renderedFallback);
        }
      }

      if (chartIds.length) {
        panel.dataset.chartIds = chartIds.join(',');
      }

      item.appendChild(panel);

      headerButton.addEventListener('click', () => {
        toggleProjectAccordionItem(item, headerButton, panel);
      });

      headerButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          headerButton.click();
        }
      });

      container.appendChild(item);
    });
  }

  function toggleProjectAccordionItem(item, header, panel) {
    const isOpen = item.classList.contains('accordion-item--open');

    if (isOpen) {
      // 收起
      item.classList.remove('accordion-item--open');
      header.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');

      // 清理展开时绑定的 transitionend 监听
      if (panel._accordionTransitionHandler) {
        panel.removeEventListener('transitionend', panel._accordionTransitionHandler);
        panel._accordionTransitionHandler = null;
      }

      // 若当前为 auto 高度，先回写为当前高度，再在下一帧改为 0 以产生折叠动画
      if (panel.style.maxHeight === 'none') {
        panel.style.maxHeight = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => {
          panel.style.maxHeight = '0px';
        });
      } else {
        panel.style.maxHeight = '0px';
      }
    } else {
      // 展开
      item.classList.add('accordion-item--open');
      header.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');

      ensureAccordionResizeListener();

      // 先设置 max-height 为内容高度，触发展开动画
      panel.style.maxHeight = `${panel.scrollHeight}px`;

      // 一次性监听 max-height 过渡结束，结束后改为 auto
      const onTransitionEnd = (event) => {
        if (event.target !== panel || event.propertyName !== 'max-height') return;

        panel.removeEventListener('transitionend', onTransitionEnd);
        panel._accordionTransitionHandler = null;

        // 仅在面板仍为展开状态时，才切换为 auto 高度
        if (panel.getAttribute('aria-hidden') === 'false') {
          panel.style.maxHeight = 'none';
        }
      };

      panel._accordionTransitionHandler = onTransitionEnd;
      panel.addEventListener('transitionend', onTransitionEnd);

      setupMediaLoadListeners(panel);

      const chartIdsAttr = panel.getAttribute('data-chart-ids');
      if (chartIdsAttr) {
        chartIdsAttr.split(',').forEach((id) => {
          const trimmed = id.trim();
          if (trimmed) initProjectChartIfNeeded(trimmed);
        });
        // 图表初始化后可能改变布局，如果仍在动画阶段则更新 max-height
        recalculatePanelHeight(panel);
      }
    }
  }

  function initProjectChartIfNeeded(chartId) {
    if (!window.echarts) return;

    const item = state.charts.find((chart) => chart.id === chartId);
    if (!item || item.initialized) return;

    const el = document.getElementById(item.id);
    if (!el) return;

    const chartInfo = item.chartInfo || {};
    const dataset = safeArray(chartInfo.dataset);

    const names = dataset.map((d) => d.name);
    const values = dataset.map((d) => d.value);

    const chart = echarts.init(el);
    const option = {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#0f172a',
        fontFamily:
          'Noto Sans SC, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: 40,
        right: 16,
        top: 32,
        bottom: 32
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569' },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: {
          color: '#64748b',
          formatter: (value) =>
            chartInfo.unit ? `${value}${chartInfo.unit}` : value
        }
      },
      series: [
        {
          name: chartInfo.title || '示例数据',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          itemStyle: {
            color: '#3b82f6'
          },
          lineStyle: {
            width: 2,
            color: '#2563eb'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.35)' },
              { offset: 1, color: 'rgba(148,163,184,0.15)' }
            ])
          },
          data: values
        }
      ]
    };

    chart.setOption(option);
    item.instance = chart;
    item.initialized = true;

    window.addEventListener('resize', () => {
      chart.resize();
    });
  }

  function renderAchievements(achievements) {
    const list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = '';

    const data = safeArray(achievements);
    if (!data.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent =
        '暂未配置学术成果。你可以在 data.json 的 achievements 字段中添加论文、专利或奖项。';
      list.appendChild(empty);
      return;
    }

    data.forEach((item) => {
      const li = document.createElement('li');
      li.className =
        'flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm shadow-slate-200/70 md:flex-row md:items-start md:gap-4 md:p-4 md:text-sm';

      const meta = document.createElement('div');
      meta.className = 'w-20 flex-shrink-0 text-xs font-medium text-slate-500 md:text-sm';
      meta.textContent = item.year || '';
      li.appendChild(meta);

      const body = document.createElement('div');
      body.className = 'flex-1';

      const titleRow = document.createElement('div');
      titleRow.className = 'flex flex-wrap items-center gap-2';

      let titleNode;
      if (item.link) {
        const link = document.createElement('a');
        link.href = item.link;
        link.target = item.link.startsWith('http') ? '_blank' : '_self';
        link.rel = item.link.startsWith('http') ? 'noreferrer' : '';
        link.className =
          'font-medium text-slate-900 underline-offset-4 hover:text-primary-600 hover:underline';
        link.textContent = item.title || '未命名成果';
        titleNode = link;
      } else {
        const span = document.createElement('span');
        span.className = 'font-medium text-slate-900';
        span.textContent = item.title || '未命名成果';
        titleNode = span;
      }
      titleRow.appendChild(titleNode);

      if (item.type) {
        const badge = document.createElement('span');
        badge.className =
          'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700';
        badge.textContent = item.type;
        titleRow.appendChild(badge);
      }

      body.appendChild(titleRow);

      if (item.venue) {
        const venue = document.createElement('p');
        venue.className = 'mt-1 text-xs text-slate-500 md:text-sm';
        venue.textContent = item.venue;
        body.appendChild(venue);
      }

      if (Array.isArray(item.tags) && item.tags.length) {
        const tags = document.createElement('div');
        tags.className = 'mt-2 flex flex-wrap gap-1';
        item.tags.forEach((tag) => {
          const chip = document.createElement('span');
          chip.className =
            'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700';
          chip.textContent = tag;
          tags.appendChild(chip);
        });
        body.appendChild(tags);
      }

      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function renderEducation(education) {
    const timeline = document.getElementById('education-timeline');
    if (!timeline) return;
    timeline.innerHTML = '';

    const data = safeArray(education);
    if (!data.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent =
        '暂未配置学历信息。你可以在 data.json 的 education 字段中添加学校、学位与时间范围。';
      timeline.appendChild(empty);
      return;
    }

    data.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'mb-6 ml-2 last:mb-0 md:ml-4';

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      li.appendChild(dot);

      const wrapper = document.createElement('div');
      wrapper.className =
        'ml-4 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm shadow-slate-200/70 md:p-4 md:text-sm';

      const heading = document.createElement('div');
      heading.className = 'flex flex-wrap items-baseline gap-2';

      const school = document.createElement('h3');
      school.className = 'font-medium text-slate-900';
      school.textContent = item.school || '未命名学校';
      heading.appendChild(school);

      if (item.degree) {
        const degree = document.createElement('span');
        degree.className = 'text-xs text-slate-600 md:text-sm';
        degree.textContent = item.degree;
        heading.appendChild(degree);
      }

      wrapper.appendChild(heading);

      const meta = document.createElement('p');
      meta.className = 'mt-1 text-xs text-slate-500';
      const period = item.period || '';
      const location = item.location || '';
      meta.textContent = [period, location].filter(Boolean).join(' · ');
      wrapper.appendChild(meta);

      if (item.details) {
        const details = document.createElement('p');
        details.className = 'mt-2 text-xs leading-relaxed text-slate-600 md:text-sm';
        details.textContent = item.details;
        wrapper.appendChild(details);
      }

      li.appendChild(wrapper);
      timeline.appendChild(li);
    });
  }

  function createLightbox() {
    let backdrop = null;
    let imageEl = null;
    let closeButton = null;
    let lastFocusedElement = null;
    let isOpen = false;

    function close() {
      if (!backdrop || !isOpen) return;
      isOpen = false;

      backdrop.classList.remove('lightbox-backdrop--open');
      document.body.classList.remove('lightbox-open');

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }

    function ensureLightboxElements() {
      if (backdrop) return;

      backdrop = document.createElement('div');
      backdrop.className = 'lightbox-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-label', '图片预览');

      const content = document.createElement('div');
      content.className = 'lightbox-content';

      imageEl = document.createElement('img');
      imageEl.className = 'lightbox-image';
      imageEl.alt = '';

      closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'lightbox-close';
      closeButton.setAttribute('aria-label', '关闭图片预览');

      const closeIcon = document.createElement('i');
      closeIcon.className = 'ri-close-line lightbox-close-icon';
      closeButton.appendChild(closeIcon);

      content.appendChild(imageEl);
      content.appendChild(closeButton);
      backdrop.appendChild(content);
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          close();
        }
      });

      closeButton.addEventListener('click', () => {
        close();
      });

      document.addEventListener('keydown', (event) => {
        if (!isOpen) return;
        if (event.key === 'Escape' || event.key === 'Esc') {
          event.preventDefault();
          close();
        }
      });
    }

    function open(src, alt) {
      ensureLightboxElements();
      if (!backdrop || !imageEl) return;

      lastFocusedElement =
        document.activeElement && typeof document.activeElement.focus === 'function'
          ? document.activeElement
          : null;

      imageEl.src = src;
      imageEl.alt = alt || '预览图片';

      document.body.classList.add('lightbox-open');
      backdrop.classList.add('lightbox-backdrop--open');
      isOpen = true;

      // 打开后将焦点移到关闭按钮，提升无障碍体验
      setTimeout(() => {
        if (closeButton) {
          closeButton.focus();
        }
      }, 0);
    }

    return {
      open,
      close
    };
  }

  const lightbox = createLightbox();

  async function loadData() {
    try {
      const response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      state.data = data;

      renderBasicInfo(data.basicInfo);
      renderProjects(data.projects);
      renderAchievements(data.achievements);
      renderEducation(data.education);
    } catch (error) {
      console.error('数据加载失败:', error);
      showFallbackMessages();
    }
  }

  function showFallbackMessages() {
    const sections = [
      { id: 'projects-grid', message: '项目示例数据加载失败，请稍后刷新重试。' },
      {
        id: 'achievements-list',
        message: '学术成果示例数据加载失败，可检查 data.json 格式。'
      },
      {
        id: 'education-timeline',
        message: '学历信息示例数据加载失败，可检查 data.json 是否存在。'
      }
    ];

    sections.forEach(({ id, message }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'text-sm text-red-500';
      p.textContent = message;
      el.appendChild(p);
    });
  }

  function setupBackToTop() {
    const button = document.getElementById('back-to-top');
    if (!button) return;

    const toggle = () => {
      if (window.scrollY > 320) {
        button.classList.add('back-to-top--visible');
      } else {
        button.classList.remove('back-to-top--visible');
      }
    };

    window.addEventListener('scroll', toggle, { passive: true });

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    toggle();
  }

  function initFooterYear() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFooterYear();
    setupBackToTop();
    loadData();
  });
})();
