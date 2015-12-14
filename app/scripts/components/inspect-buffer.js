import React from 'react'

export default class InspectBuffer extends React.Component {
  render() {
    if (!this.props.buffer) {
      return <i>Recieved no buffer.</i>;
    }

    if (this.props.buffer.type != "Buffer") {
      return <i>This is not a buffer.</i>;
    }

    let byteCodeRepresentation = this.props.buffer.data.join(" ");
    let stringRepresentation = this.props.buffer.data.map((charCode) => String.fromCharCode(charCode)).join("");
    let mixedStringRepresentation = this.props.buffer.data.map((charCode, index) => {
      if (charCode >= 31) {
        return String.fromCharCode(charCode);
      } else {
        let icon_name;
        switch (charCode) {
          case 0: icon_name = 'exposure_zero';
            break;
          case 1: icon_name = 'looks_one';
            break;
          case 2: icon_name = 'looks_two';
            break;
          case 3: icon_name = 'looks_3';
            break;
          case 4: icon_name = 'looks_4';
            break;
          case 5: icon_name = 'looks_5';
            break;
          case 6: icon_name = 'looks_6';
            break;

          default:
            icon_name = 'details';
        }

        return <i key={index}
                  className="material-icons icon-between-text tooltipped"
                  data-position="bottom"
                  data-delay="50"
                  data-tooltip={charCode}>{icon_name}</i>;
      }
    });

    return <div>
      <h5>String representation</h5>
      {stringRepresentation}
      <hr />
      {mixedStringRepresentation}
      <h5>Byte Values</h5>
      {byteCodeRepresentation}
    </div>;
  }
}