var swiper = new Swiper(".mySwiper", {
  effect: "coverflow",
  loopAdditionalSlides: 10,

  breakpoints: {
    100: {
      loop: true,
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "1",

      coverflowEffect: {
        rotate: 40,
        stretch: 10,
        depth: 40,
        modifier: 1,
        scale: 0.9,
      },

      autoplay: {
        delay: 5000,
      },
    },

    550: {
      loop: true,
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "2",

      coverflowEffect: {
        rotate: 0,
        stretch: 130,
        depth: 50,
        modifier: 1,
        scale: 0.8,
      },

      autoplay: {
        delay: 5000,
      },
    },

    700: {
      loop: true,
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "3",

      coverflowEffect: {
        rotate: 0,
        stretch: -10,
        depth: 50,
        modifier: 1,
        scale: 0.85,
      },

      autoplay: {
        delay: 5000,
      },
    },

    910: {
      loop: true,
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "4",

      coverflowEffect: {
        rotate: 0,
        stretch: -10,
        depth: 50,
        modifier: 1,
        scale: 0.85,
      },

      autoplay: {
        delay: 5000,
      },
    },

    1121: {
      loop: true,
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "5",

      coverflowEffect: {
        rotate: 0,
        stretch: -30,
        depth: 50,
        modifier: 1,
        scale: 0.85,
      },

      autoplay: {
        delay: 5000,
      },
    },
  },
});

const scrollTop = document.querySelector(".scrollTop");

if (scrollTop) {
  scrollTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const scrollVisibility = () => {
    scrollTop.style.display = window.scrollY >= 1000 ? "block" : "none";
  };

  window.addEventListener("scroll", scrollVisibility);
  scrollVisibility();
}



// wadawdwa


const chakrasContainer = document.querySelector('.all-chakras');
const chakraElements = document.querySelectorAll('.card');

const chakraColors = {
  muladhara: '#eb040c',
  svadhistana: '#f57200',
  manipura: '#feb302',
  anahata: '#02a552',
  vishudha: '#00adef',
  ajna: '#2e47a4',
  sahasrara: '#a4108c'
};

function updateScrollbarColor() {
  let middleScrollPosition = chakrasContainer.scrollLeft + chakrasContainer.clientWidth / 2;

  chakraElements.forEach((chakra) => {
    let chakraLeft = chakra.offsetLeft;
    let chakraRight = chakraLeft + chakra.clientWidth;

    if (middleScrollPosition >= chakraLeft && middleScrollPosition <= chakraRight) {
      let chakraClass = Array.from(chakra.classList).find(cls => chakraColors[cls]);
      console.log(chakraClass);
      if (chakraClass) {
        document.documentElement.style.setProperty('--scrollbar-thumb-color', chakraColors[chakraClass]);
      }
    }
  });
}

if (chakrasContainer) {
  chakrasContainer.addEventListener('scroll', updateScrollbarColor);

  window.onload = function () {
    chakrasContainer.scrollLeft = (chakrasContainer.scrollWidth - chakrasContainer.clientWidth) / 2;
    updateScrollbarColor();
  };
}
