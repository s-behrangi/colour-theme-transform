import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom';
import { styled, createTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';
import './App.css';
import { converter, formatHex } from 'culori';
import { HuePicker } from 'react-color';
import { Reorder, useDragControls } from "motion/react";

const toHSL = converter('hsl');

function GreyBox() {
  const [colours, setColours] = useState([]);
  const [transformParams, setParams] = useState({
    brightness: 0,
    hueShiftChecked: false,
    hueShiftTarget: 0,
    inversionChecked: false,
    inversionMidpoint: 50
  });
  const [isTextInputOpen, setTextInput] = useState(false);
  const [isColourConvertOpen, setColourConvert] = useState(false);

  const addItem = (colour = "#123456") => {
    const newId = crypto.randomUUID();
    setColours([...colours, { id: newId, value: colour}]);
  };

  const removeItem = (id) => {
    setColours(colours.filter(colour => colour.id != id));
  };

  const updateParams = useCallback((fieldName, value) => {
    setParams((prevParams) => ({
      ...prevParams,
      [fieldName] : value
    }))
  }, []);

  const updateItem = useCallback((id, value) => {
    setColours(prevColours => prevColours.map(colour =>
      colour.id === id ? {...colour, value: value} : colour
    ))
  }, []);

  const clearColours = () => {
    setColours([]);
  }

  const iterateColours = () => {
    setColours(transformedColours);
    setTimeout(() => {
      const pickers = document.querySelectorAll('.coloris-picker');
      for (const picker of pickers) {
        picker.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 0);
  };

  const handleTextSubmit = (text) => {
    setTextInput(false);

    const uniqueColours = new Set();
    const hexMatch = /(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8})/g;
    const matchedColours = text.matchAll(hexMatch);

    for (const newColour of matchedColours) {
      uniqueColours.add(newColour[0]);
    }

    const newColours = []

    for (const uniqueColour of uniqueColours) {
      const newId = crypto.randomUUID();
      newColours.push({id: newId, value: uniqueColour});
    }

    setColours(prevColours => [...prevColours, ...newColours]);
  };

  const handleTextConvert = (text) => {
    const toReplace = {};
    for (let i = 0; i < colours.length; i++) {
      toReplace[formatHex(colours[i].value)] = formatHex(transformedColours[i].value);
    }

    const replaceRegex = new RegExp(Object.keys(toReplace).join("|"), "g");

    return text.replace(replaceRegex, matched => toReplace[matched]);
  };

  const transformation = useMemo(() => {
    return (c) => {
      let colour = toHSL(c);

      if (colours.length > 0 && transformParams.hueShiftChecked) {
        const hueAnchor = toHSL(colours[0].value).h;
        const hueDiff = colour.h - hueAnchor;
        let newHue = transformParams.hueShiftTarget + hueDiff;
        if (newHue >= 360) {
          newHue -= 360;
        } else if (newHue < 0) {
          newHue += 360;
        }
        colour.h = newHue;
      }

      if (transformParams.inversionChecked) {
        const lumMid = transformParams.inversionMidpoint / 100.0;
        if (colour.l > lumMid) {
          colour.l = lumMid - lumMid * (colour.l - lumMid) / (1 - lumMid);
        } else if (colour.l < lumMid) {
          colour.l = 1 - (1 - lumMid) * colour.l / lumMid;
        }
      }

      if (transformParams.brightness > 0) {
        colour.l = colour.l + (1 - colour.l) * (transformParams.brightness / 100.0);
      } else {
        colour.l = colour.l + colour.l * (transformParams.brightness / 100.0);
      }

      return formatHex(colour);
    } 
  }, [transformParams, colours]);

  const transformedColours = useMemo(() => {
    if (colours.length === 0) {
      return [];
    }
    return colours.map((colour) => ({
        id: colour.id,
        value: transformation(colour.value)
    }));
  }, [colours, transformation]); 

  useEffect(() => {
    if (window.Coloris) {
      window.Coloris({
        onChange: (color, inputEl) => {
          updateItem(inputEl.id, color);
        },  
        el: '.coloris-picker',
        theme: 'polaroid',
        swatches: false,
        formatToggle: true,
        closeButton: true,
        clearButton: true,
        wrap: true,
        autoClose: false, 
        selectInput: false,
      });
    }
  }, [colours.length]);

  return (
    <div className = "grey-box">
      <InputColours 
        colours={colours}
        onAdd={addItem}
        onRemove={removeItem}
        onUpdate={updateItem}
        onTextInputToggle={setTextInput}
        onClear={clearColours}
        onReorder={(newOrder) => setColours(newOrder)}
       />
      <TransColumn 
        values={transformParams}
        onChange={updateParams}
      />
      <OutputColours 
        colours = {transformedColours}
        onTextConvertToggle={setColourConvert}
        onIterate={iterateColours}
      />

      {isTextInputOpen && (
        <ColourTextInput 
          onClose={setTextInput}
          onSubmit={handleTextSubmit}
        />
      )}

      {isColourConvertOpen && (
        <ConvertTextInput 
          onClose={setColourConvert}
          onSubmit={handleTextConvert}
        />
      )}
    </div>
  );
}

function InputColours({colours, onAdd, onRemove, onUpdate, onTextInputToggle, onClear, onReorder}) {  
  return (
    <div className = "input-colours">
      <div className = "input-button-row">
        <button
          onClick={() => onAdd("#123456")}
          className="add-button"
        >
          +
        </button>
        <button
          onClick={onClear}
          className="clear-input-button"
        >
          Clear
        </button>
        <button
          onClick={() => onTextInputToggle(true)}
          className="open-text-input-button"
        >
          &#9998;
        </button>
      </div>
      <Reorder.Group axis="y" values={colours} onReorder={onReorder}>
        {colours.map((colour) => (
          <DraggableColourInput
           key={colour.id}
           colour={colour}
           onUpdate={onUpdate}
           onRemove={onRemove}
           />        
        ))}
      </Reorder.Group>
      {colours.length > 0 && 
      <div
        className = "input-button-row"
      >
        <button
          onClick={() => onAdd("#123456")}
          className="add-button"
        >
          +
        </button>
        <button
          onClick={() => onTextInputToggle(true)}
          className="open-text-input-button"
        >
          &#9998;
        </button>
      </div>
      }
    </div>
  );
}

function DraggableColourInput({ colour, onUpdate, onRemove}) {
  const controls = useDragControls();

  return (
    <Reorder.Item 
            key={colour.id} 
            value={colour} 
            dragListener={false}
            dragControls={controls}
          >
            <ColourInput 
                id = {colour.id}
                value = {colour.value}
                onUpdate= {onUpdate}
                onRemove = {onRemove}
                dragControls={controls}
              />
          </Reorder.Item>
  )
}

function ColourInput({id, value, onUpdate, onRemove, dragControls}) {
  const inputRef = useRef(null);

  const handleRemove = (event) => {
    onRemove(id);
  }

  return (
    <div className = "colour-input">
      <div className= "input-picker">
        <input 
        ref={inputRef}
        id={id}
        type="text" 
        className="coloris-picker" 
        value={value} 
        readOnly
        data-coloris
        ></input>
      </div>
      <div className = "input-value">
        <p>{value}</p>
      </div>
      <div className = "input-delete">
        <button
          className = "delete-button"
          onClick = {handleRemove}
          aria-label = "Remove item"
        >
          &times;
        </button>
      </div>
      <div
        className="reorder-handle"
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        aria-label="Drag to reorder"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dragControls.start(e);
          }
        }}
      ><p aria-hidden="true">≡</p></div>
    </div>
  );
}

function OutputColours({colours, onTextConvertToggle, onIterate}) {
  return (
    <div className="output-colours">
      <div className = "convert-text">
        <div className = "input-button-row">
          <button
            onClick={() => onTextConvertToggle(true)}
            className="convert-text-button"
          >
            Convert
          </button>
        </div>
      </div>
      <ul>
      {colours.map((colour) => (
        <ColourOutput 
          key = {colour.id}
          id = {colour.id}
          value = {colour.value}
        />
      ))}
      </ul>
      {colours.length > 0 && 
      <div className="input-button-row">
        <button
          className="iterate-button"
          onClick={onIterate}
        >
          &#8635;
        </button>  
      </div>}
    </div>
  )
}

const ColourOutput = React.memo(function ColourOutput({id, value}) {
  return (
    <div className = "colour-output">
      <div 
        className = "output-swatch"
        style = {{backgroundColor: value}}>
      </div>
      <div className = "output-hex-row">
        <p className = "output-hex">{value}</p>
        <button 
          className = "copy-hex-button"
          onClick = {() => (navigator.clipboard.writeText(value))}
        >
          <i className="fa fa-copy" />
        </button>
      </div>
    </div>
  );
});

function TransColumn ({onChange, values}) {

  const handleChange = (name, val) => {
    values[name] = val;
    onChange(name, val);
  };

  return (
    <div className = "trans-column">
      <fieldset className = "trans-field">
        <legend>Luminance</legend>
        <InputSlider 
          value={values.brightness}
          onChange={(val) => onChange('brightness', val)}
        />
      </fieldset>
      <fieldset className = "trans-field">
        <legend>Invert Luminance</legend>
        <InversionCheckbox
          value ={values.inversionChecked}
          onChange={(val) => handleChange('inversionChecked', val)}
        />
        <InversionSlider
          value={values.inversionMidpoint}
          onChange={(val) => handleChange('inversionMidpoint', val)}
        />
      </fieldset>
      <fieldset className = "trans-field">
        <legend>Shift Hue</legend>
        <HueShiftCheckbox 
          value={values.hueShiftChecked}
          onChange={(val) => handleChange('hueShiftChecked', val)}
        />
        <HueSlider 
        value={values.hueShiftTarget}
          onChange={(val) => handleChange('hueShiftTarget', val)}
        />
      </fieldset>
      <fieldset className = "trans-field about-text">
        <legend>About</legend>
        <p>A tool intended for converting colour themes into new themes that preserve
           important distinctions in hue and contrast. For example, turning a purple-dominant
            theme into a green-dominant one.</p>

        <p>Add colours on the left. Using the &#9998; button, you can paste bulk text and the 
           tool will extract unique (hex-formatted) colours automatically.</p>

        <p>Adjust using the column above. Luminance controls brightness, while the inversion
           option allows you to invert brightness across the chosen midpoint. This can be
           useful for turning light-mode into dark-mode or vice versa.</p>
        
        <p>Hue shift will use the first input colour as an "anchor", changing its hue to the one specified. The 
           other colours will be hue-shifted to maintain their relative hue distance from the anchor.</p> 
          
        <p>Transformed colours appear on the right. You can copy them one at a time, or you can hit the "Convert"
           button, which will allow you to bulk-convert any (hex-formatted) colours in the text you provide.
        </p>

        <p>The &#8635; button uses the output colours as new inputs. This overwrites the previous inputs, 
          which <em> cannot be undone.</em> It can be useful for rapidly iterating adjustments.</p>

        <p>View source <a href="https://github.com/s-behrangi/colour-theme-transform">here</a>.</p>
      </fieldset>
    </div>
  );
}

function InversionSlider({onChange, value}) {
  const handleSliderChange = (event, newValue) => {
    onChange(newValue);
  };

  const handleInputChange = (event) => {
    onChange(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleBlur = () => {
      if (value < 0) {
      onChange(0);
    } else if (value > 100) {
      onChange(100);
    }
  };

  return (
    <div className = "input-slider inversion-slider">
      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid>
        </Grid>
        <Grid size="grow">
            <Slider
              color="#ffffff"
              min={0}
              max={100}
              value={typeof value === 'number' ? value : 0}
              onChange={handleSliderChange}
              aria-labelledby="input-slider"
            />

        </Grid>
        <Grid>
          <Input
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
}

function InversionCheckbox({onChange, value}) {
  return (
    <div className = "inversion-checkbox">
      <input
        type = "checkbox"
        checked = {value}
        onChange = {(event) => onChange(event.target.checked)}
      />
    </div>
  )
}

function HueShiftCheckbox({onChange, value}) {
  return (
    <div className="hue-shift-checkbox">
      <input 
        type = "checkbox"
        checked = {value}
        onChange = {(event) => onChange(event.target.checked)}
      />
    </div>
  )
}

function HueSlider({onChange, value}) {
  const colour = useMemo(() => {
    return {hsl: { h: value, s: 0, l: 0, a: 0}};
  }, [value]);

  const handleInputChange = (event) => {
    const newHue = event.target.value === '' ? 0 : Math.max(0, Math.min(359, Math.round(Number(event.target.value))));
    onChange(newHue);
  };

  const handleSliderChange = (newColour) => {
    onChange(Math.round(newColour.hsl.h));
  };

  return (
    <div className = "hue-slider" >
      <HuePicker
        color={colour.hsl}
        onChange={handleSliderChange}
        width="100%"
      />
      <Input
            value={value}
            size="small"
            onChange={handleInputChange}
            inputProps={{
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
    </div>
  );
}

function InputSlider({onChange, value}) {
  const handleInputChange = (event) => {
    onChange(event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleBlur = () => {
    if (value < -100) {
      onChange(-100);
    } else if (value > 100) {
      onChange(100);
    }
  };

  return (
    <div className = "input-slider">
      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid>
        </Grid>
        <Grid size="grow">
          <Slider
            color="#ffffff"
            min={-100}
            max={100}
            value={typeof value === 'number' ? value : 0}
            onChange={(event, newValue) => onChange(newValue)}
            aria-labelledby="input-slider"
          />
        </Grid>
        <Grid>
          <Input
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
}

const Input = styled(MuiInput)`
  width: 42px;
`;

function ColourTextInput ({onSubmit, onClose}) {
  const [inputText, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeydown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose(false);
    }
  };

  const handleSubmit = () => {
    onSubmit(inputText);
  };

  const colourTextInputWindow = (
    <div className = "input-overlay">
      <div className = "input-overlay-content">
        <p>Can be a neat comma/line separated list, or just raw text...</p>
        <textarea className = "input-overlay-text-input"
          ref = {inputRef}
          value = {inputText}
          onChange = {(e) => setText(e.target.value)}
          onKeyDown = {handleKeydown}
          rows = "20"
        />
        <div className = "input-overlay-buttons">
          <button 
            className = "close-colour-text-input"
            onClick={() => onClose(false)}
          >
            Close
          </button>
          <button 
            className = "submit-colour-text-input"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(colourTextInputWindow, document.body);
}

function ConvertTextInput ({onSubmit, onClose}) {
  const [inputText, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeydown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose(false);
    }
  };

  const handleSubmit = () => {
    setText(onSubmit(inputText));
  };

  const handleCopy = () => {
    const copyText = document.getElementById("conversion-text");

    copyText.select();
    copyText.setSelectionRange(0, 999999); 

    navigator.clipboard.writeText(copyText.value);
  };

  const convertTextInputWindow = (
    <div className = "input-overlay">
      <div className = "input-overlay-content">
        <p>Paste any text (e.g. a JSON settings file)</p>
        <textarea className = "input-overlay-text-input"
          id = "conversion-text"
          ref = {inputRef}
          value = {inputText}
          onChange = {(e) => setText(e.target.value)}
          onKeyDown = {handleKeydown}
          rows = "20"
        />
        <div className = "input-overlay-buttons">
          <button 
            className = "close-input-overlay"
            onClick={() => onClose(false)}
          >
            Close
          </button>
          <button 
            className = "submit-input-overlay"
            onClick={handleSubmit}
          >
            Convert
          </button>
          <button 
            className = "copy-conversion-button"
            onClick = {handleCopy}
          >
          <i className="fa fa-copy" />
        </button>
        </div>
      </div>
    </div>
  );

  return createPortal(convertTextInputWindow, document.body);
}

function App() {
  return (
    <>
      <GreyBox />
    </>
  )
}

export default App
