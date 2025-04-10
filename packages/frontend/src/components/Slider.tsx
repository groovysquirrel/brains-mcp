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

  return (
    <div className="slider-container">
      <Carousel activeIndex={index} onSelect={handleSelect} interval={null} indicators={true} controls={true}>
        {images.map((image) => (
          <Carousel.Item key={image.filename}>
            <img
              className="d-block w-100 slider-image"
              src={image.src}
              alt={image.alt}
              onClick={() => openLightbox(image)}
              style={{ cursor: 'pointer' }}
            />
          </Carousel.Item>
        ))}
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