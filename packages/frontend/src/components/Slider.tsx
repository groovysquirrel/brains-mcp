import React, { useState, useEffect } from 'react';
import { Carousel, Modal, Button } from 'react-bootstrap';
import './Slider.css';
import { DiagramImage } from '../lib/imageUtils';
import { IoCloseCircle } from 'react-icons/io5';

interface SliderProps {
  images: DiagramImage[];
}

const Slider: React.FC<SliderProps> = ({ images }) => {
  const [index, setIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DiagramImage | null>(null);

  const handleSelect = (selectedIndex: number) => {
    setIndex(selectedIndex);
  };

  const openLightbox = (image: DiagramImage) => {
    setSelectedImage(image);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  // Auto-rotate the slides every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [images.length]);

  // Create custom indicators to ensure correct count
  const renderIndicators = () => {
    return (
      <div className="carousel-indicators">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={i === index ? "active" : ""}
            aria-current={i === index ? "true" : "false"}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="slider-container">
      <Carousel 
        activeIndex={index} 
        onSelect={handleSelect} 
        interval={null} 
        indicators={false}
        controls={false}
        className="h-100 position-static"
      >
        {images.map((image) => (
          <Carousel.Item key={image.filename} className="h-100">
            <div className="d-flex align-items-center justify-content-center h-100">
              <img
                className="slider-image"
                src={image.src}
                alt={image.alt}
                onClick={() => openLightbox(image)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </Carousel.Item>
        ))}
        <a className="carousel-control-prev" role="button" tabIndex={0} onClick={(e) => {
          e.preventDefault();
          setIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
        }}>
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </a>
        <a className="carousel-control-next" role="button" tabIndex={0} onClick={(e) => {
          e.preventDefault();
          setIndex((prevIndex) => (prevIndex + 1) % images.length);
        }}>
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </a>
        {renderIndicators()}
      </Carousel>

      {/* Lightbox Modal */}
      <Modal 
        show={showLightbox} 
        onHide={closeLightbox} 
        centered
        size="xl"
        dialogClassName="lightbox-modal"
      >
        <Modal.Header>
          <Button
            variant="link"
            onClick={closeLightbox}
            className="close-button"
            aria-label="Close lightbox"
          >
            <IoCloseCircle size={32} />
          </Button>
        </Modal.Header>
        <Modal.Body className="p-0 text-center">
          {selectedImage && (
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="lightbox-image"
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Slider; 