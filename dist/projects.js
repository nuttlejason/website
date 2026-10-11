'use strict';
// Progressive enhancement: without JavaScript every project remains a normal link.
const allProjects=[...document.querySelectorAll('.project-row')];
const filterBar=document.querySelector('.project-filters');
const filterButtons=[...filterBar.querySelectorAll('[data-filter]')];
function filterProjects(type,updateURL=false){
  if(!filterButtons.some(button=>button.dataset.filter===type))type='All';
  let count=0;
  allProjects.forEach(link=>{
    const show=type==='All'||(type==='Featured'?link.dataset.featured==='true':link.dataset.tags.split(',').includes(type));
    link.hidden=!show;
    if(show)count++;
  });
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===type)));
  document.querySelector('#filter-status').textContent=count+' '+(count===1?'project':'projects')+(type==='All'?'':' · '+type);
  if(updateURL){
    const url=new URL(location.href);
    if(type==='All')url.searchParams.delete('type');
    else url.searchParams.set('type',type);
    history.pushState(null,'',url);
  }
}
filterBar.hidden=false;
filterButtons.forEach(button=>button.addEventListener('click',()=>filterProjects(button.dataset.filter,true)));
window.addEventListener('popstate',()=>filterProjects(new URL(location.href).searchParams.get('type')||'All'));
filterProjects(new URL(location.href).searchParams.get('type')||'All');
